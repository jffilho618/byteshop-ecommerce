// ============================================
// Edge Function: Exportar Pedidos em CSV
// ============================================
// Descrição: Exporta pedidos para arquivo CSV com filtros
// Permissões: Apenas admin pode exportar
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // Parse query parameters
    const url = new URL(req.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const status = url.searchParams.get('status');

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verificar se usuário é admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');

    // Se for SERVICE_ROLE_KEY, permitir acesso direto (bypass auth check)
    const isServiceRole = token === SUPABASE_SERVICE_KEY;

    if (!isServiceRole) {
      // Verificar autenticação de usuário normal
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        throw new Error('Unauthorized');
      }

      // Verificar se é admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData?.role !== 'admin') {
        throw new Error('Admin access required');
      }
    }

    // Buscar pedidos com filtros
    let query = supabase
      .from('admin_order_details')
      .select('*')
      .order('order_date', { ascending: false });

    if (startDate) {
      query = query.gte('order_date', startDate);
    }
    if (endDate) {
      query = query.lte('order_date', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    // Converter para CSV
    const headers = [
      'ID do Pedido',
      'Cliente',
      'Email',
      'Status',
      'Valor Total',
      'Data do Pedido',
      'Endereço',
      'Total de Itens',
    ];

    const csvRows = [headers.join(',')];

    // Agrupar pedidos por order_id (pois admin_order_details retorna múltiplas linhas)
    const orderMap = new Map();
    for (const item of orders) {
      if (!orderMap.has(item.order_id)) {
        orderMap.set(item.order_id, {
          order_id: item.order_id,
          customer_name: item.customer_name,
          customer_email: item.customer_email,
          status: item.status,
          total_amount: item.total_amount,
          order_date: item.order_date,
          delivery_address: item.delivery_address,
          items_count: 0,
        });
      }
      orderMap.get(item.order_id).items_count++;
    }

    for (const order of orderMap.values()) {
      const row = [
        order.order_id,
        `"${order.customer_name}"`,
        order.customer_email,
        order.status,
        order.total_amount.toFixed(2),
        new Date(order.order_date).toLocaleDateString('pt-BR'),
        `"${order.delivery_address || 'N/A'}"`,
        order.items_count,
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');
    const executionTime = Date.now() - startTime;

    // Registrar log de sucesso
    await supabase.from('edge_function_logs').insert({
      function_name: 'export-order-csv',
      execution_time_ms: executionTime,
      status: 'success',
      metadata: {
        auth_method: isServiceRole ? 'service_role' : 'user_jwt',
        orders_count: orders.length,
        filters: { start_date: startDate, end_date: endDate, status },
      },
    });

    // Retornar CSV
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.csv"`,
      },
      status: 200,
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;

    // Registrar log de erro
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from('edge_function_logs').insert({
      function_name: 'export-order-csv',
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
// 1. Deploy: supabase functions deploy export-order-csv
// 2. Testar via curl ou integração com frontend
//
// Exemplo de chamada:
// const { data } = await supabase.functions.invoke(
//   'export-order-csv',
//   {
//     method: 'GET',
//     headers: {
//       Authorization: `Bearer ${session.access_token}`
//     }
//   }
// );
//
// Ou com filtros:
// GET /export-order-csv?start_date=2025-01-01&status=delivered
// ============================================
