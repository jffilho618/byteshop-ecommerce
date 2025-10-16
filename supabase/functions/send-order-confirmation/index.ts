// ============================================
// Edge Function: Envio de Email de Confirmação de Pedido
// ============================================
// Descrição: Envia email de confirmação quando um pedido é criado
// Integração: Resend API (ou outro serviço de email)
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { order_id } = await req.json();

    if (!order_id) {
      throw new Error('order_id is required');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Buscar detalhes do pedido (retorna múltiplas linhas - uma por item)
    const { data: orderItems, error: orderError } = await supabase
      .from('admin_order_details')
      .select('*')
      .eq('order_id', order_id);

    if (orderError || !orderItems || orderItems.length === 0) {
      throw new Error(`Order not found: ${order_id}`);
    }

    // Primeira linha tem dados do pedido
    const order = orderItems[0];

    // Buscar template de email
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'order_confirmation')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error('Email template not found');
    }

    // Preparar variáveis para o template
    const variables = {
      order_id: order.order_id,
      customer_name: order.customer_name,
      order_date: new Date(order.order_date).toLocaleDateString('pt-BR'),
      items: orderItems.map((item: any) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price).toFixed(2),
        subtotal: parseFloat(item.subtotal).toFixed(2),
      })),
      total_amount: order.total_amount.toFixed(2),
      shipping_address: order.delivery_address || 'Endereço não disponível',
      orders_url: `${Deno.env.get('FRONTEND_URL')}/pages/orders.html`,
    };

    // Renderizar template (simples replace)
    let emailBody = template.html_body;

    // Substituir variáveis simples
    emailBody = emailBody.replace(/\{\{order_id\}\}/g, variables.order_id);
    emailBody = emailBody.replace(/\{\{customer_name\}\}/g, variables.customer_name);
    emailBody = emailBody.replace(/\{\{order_date\}\}/g, variables.order_date);
    emailBody = emailBody.replace(/\{\{total_amount\}\}/g, variables.total_amount);
    emailBody = emailBody.replace(/\{\{shipping_address\}\}/g, variables.shipping_address);
    emailBody = emailBody.replace(/\{\{orders_url\}\}/g, variables.orders_url);

    // Renderizar itens (se houver)
    if (variables.items && variables.items.length > 0) {
      const itemsHtml = variables.items
        .map(
          (item: any) => `
        <div class="item">
          <p><strong>${item.product_name}</strong></p>
          <p>Quantidade: ${item.quantity} x R$ ${parseFloat(item.unit_price).toFixed(2)}</p>
          <p>Subtotal: R$ ${parseFloat(item.subtotal).toFixed(2)}</p>
        </div>
      `
        )
        .join('');

      emailBody = emailBody.replace(/\{\{#items\}\}.*?\{\{\/items\}\}/gs, itemsHtml);
    }

    // Enviar email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: order.customer_email,
        subject: template.subject.replace('{{order_id}}', order_id.substring(0, 8)),
        html: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const executionTime = Date.now() - startTime;

    // Registrar log de sucesso
    await supabase.from('edge_function_logs').insert({
      function_name: 'send-order-confirmation',
      execution_time_ms: executionTime,
      status: 'success',
      metadata: {
        order_id,
        user_email: order.customer_email,
        sent_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order confirmation email sent',
        order_id,
        execution_time_ms: executionTime,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;

    // Registrar log de erro
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from('edge_function_logs').insert({
      function_name: 'send-order-confirmation',
      execution_time_ms: executionTime,
      status: 'error',
      error_message: error.message,
      metadata: { error_stack: error.stack },
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Unknown error',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});

// ============================================
// COMO USAR:
// ============================================
// 1. Deploy: supabase functions deploy send-order-confirmation
// 2. Configurar variáveis: RESEND_API_KEY, FRONTEND_URL
// 3. Testar via curl ou integração com backend
//
// Exemplo de chamada:
// const { data, error } = await supabase.functions.invoke(
//   'send-order-confirmation',
//   { body: { order_id: 'uuid-do-pedido' } }
// );
// ============================================
