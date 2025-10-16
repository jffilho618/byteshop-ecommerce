/**
 * ============================================
 * BYTESHOP - SUPABASE BACKUP SCRIPT
 * ============================================
 * Faz backup completo do schema public do Supabase
 * Inclui: enums, tables, views, functions, policies, triggers
 * ============================================
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração
const config = {
  host: 'db.cliihgjajttoulpsrxzh.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'xrZQjTaqWJq7LvLN',
  ssl: {
    rejectUnauthorized: false,
  },
};

const BACKUP_DIR = path.join(__dirname, 'supabase', 'backups');
const TIMESTAMP =
  new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] +
  '_' +
  new Date().toTimeString().split(' ')[0].replace(/:/g, '');
const BACKUP_FILE = path.join(BACKUP_DIR, `backup_${TIMESTAMP}.sql`);

// Criar diretório
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('============================================');
console.log('BYTESHOP - BACKUP SUPABASE');
console.log('============================================');
console.log('Host:', config.host);
console.log('Database:', config.database);
console.log('Backup file:', BACKUP_FILE);
console.log('============================================\n');

async function backup() {
  const client = new Client(config);
  let dumpContent = `-- ============================================
-- BYTESHOP - DATABASE BACKUP
-- Generated: ${new Date().toISOString()}
-- Project: cliihgjajttoulpsrxzh
-- ============================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

`;

  try {
    console.log('📡 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // 1. ENUMS
    console.log('📥 Baixando ENUMs...');
    const enumsQuery = `
      SELECT
        n.nspname as schema,
        t.typname as name,
        string_agg(e.enumlabel, ''', ''' ORDER BY e.enumsortorder) as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      GROUP BY n.nspname, t.typname
      ORDER BY t.typname;
    `;
    const enums = await client.query(enumsQuery);
    dumpContent += `\n-- ============================================\n`;
    dumpContent += `-- ENUMS\n`;
    dumpContent += `-- ============================================\n\n`;
    for (const row of enums.rows) {
      dumpContent += `CREATE TYPE ${row.schema}.${row.name} AS ENUM ('${row.values}');\n`;
    }
    console.log(`   ✓ ${enums.rows.length} enum(s)\n`);

    // 2. TABLES (estrutura)
    console.log('📥 Baixando estrutura de tabelas...');
    const tablesQuery = `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    const tables = await client.query(tablesQuery);

    dumpContent += `\n-- ============================================\n`;
    dumpContent += `-- TABLES\n`;
    dumpContent += `-- ============================================\n\n`;

    for (const table of tables.rows) {
      const tableName = table.tablename;

      // Obter definição completa da tabela
      const tableDefQuery = `
        SELECT
          'CREATE TABLE public.' || c.relname || ' (' ||
          string_agg(
            a.attname || ' ' ||
            pg_catalog.format_type(a.atttypid, a.atttypmod) ||
            CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN pg_get_expr(d.adbin, d.adrelid) IS NOT NULL
              THEN ' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid)
              ELSE ''
            END,
            ', '
            ORDER BY a.attnum
          ) || ');' as create_statement
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid
        LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
        WHERE n.nspname = 'public'
          AND c.relname = $1
          AND a.attnum > 0
          AND NOT a.attisdropped
        GROUP BY c.relname;
      `;
      const tableDef = await client.query(tableDefQuery, [tableName]);

      if (tableDef.rows.length > 0) {
        dumpContent += `${tableDef.rows[0].create_statement}\n\n`;
      }

      // Primary keys
      const pkQuery = `
        SELECT
          'ALTER TABLE ONLY public.' || tc.table_name ||
          ' ADD CONSTRAINT ' || tc.constraint_name ||
          ' PRIMARY KEY (' || string_agg(kcu.column_name, ', ') || ');'
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1
        GROUP BY tc.table_name, tc.constraint_name;
      `;
      const pk = await client.query(pkQuery, [tableName]);
      if (pk.rows.length > 0) {
        dumpContent += `${pk.rows[0]['?column?']}\n`;
      }

      // Foreign keys
      const fkQuery = `
        SELECT
          'ALTER TABLE ONLY public.' || tc.table_name ||
          ' ADD CONSTRAINT ' || tc.constraint_name ||
          ' FOREIGN KEY (' || kcu.column_name || ')' ||
          ' REFERENCES public.' || ccu.table_name || '(' || ccu.column_name || ')' ||
          CASE WHEN rc.delete_rule != 'NO ACTION' THEN ' ON DELETE ' || rc.delete_rule ELSE '' END ||
          CASE WHEN rc.update_rule != 'NO ACTION' THEN ' ON UPDATE ' || rc.update_rule ELSE '' END ||
          ';'
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1;
      `;
      const fk = await client.query(fkQuery, [tableName]);
      for (const row of fk.rows) {
        dumpContent += `${row['?column?']}\n`;
      }

      dumpContent += `\n`;
    }
    console.log(`   ✓ ${tables.rows.length} tabela(s)\n`);

    // 3. VIEWS
    console.log('📥 Baixando views...');
    const viewsQuery = `
      SELECT
        schemaname,
        viewname,
        definition
      FROM pg_views
      WHERE schemaname = 'public'
      ORDER BY viewname;
    `;
    const views = await client.query(viewsQuery);
    dumpContent += `\n-- ============================================\n`;
    dumpContent += `-- VIEWS\n`;
    dumpContent += `-- ============================================\n\n`;
    for (const row of views.rows) {
      dumpContent += `CREATE VIEW ${row.schemaname}.${row.viewname} AS\n${row.definition}\n\n`;
    }
    console.log(`   ✓ ${views.rows.length} view(s)\n`);

    // 4. FUNCTIONS
    console.log('📥 Baixando functions...');
    const functionsQuery = `
      SELECT pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname;
    `;
    const functions = await client.query(functionsQuery);
    dumpContent += `\n-- ============================================\n`;
    dumpContent += `-- FUNCTIONS\n`;
    dumpContent += `-- ============================================\n\n`;
    for (const row of functions.rows) {
      dumpContent += `${row.definition};\n\n`;
    }
    console.log(`   ✓ ${functions.rows.length} function(s)\n`);

    // 5. POLICIES
    console.log('📥 Baixando policies...');
    const policiesQuery = `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    const policies = await client.query(policiesQuery);
    dumpContent += `\n-- ============================================\n`;
    dumpContent += `-- ROW LEVEL SECURITY POLICIES\n`;
    dumpContent += `-- ============================================\n\n`;

    // Habilitar RLS nas tabelas
    const rlsTables = [...new Set(policies.rows.map((p) => p.tablename))];
    for (const table of rlsTables) {
      dumpContent += `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;\n`;
    }
    dumpContent += `\n`;

    for (const row of policies.rows) {
      dumpContent += `CREATE POLICY ${row.policyname}\n`;
      dumpContent += `  ON ${row.schemaname}.${row.tablename}\n`;
      dumpContent += `  AS ${row.permissive}\n`;
      dumpContent += `  FOR ${row.cmd}\n`;
      if (row.roles && Array.isArray(row.roles) && row.roles.length > 0) {
        dumpContent += `  TO ${row.roles.join(', ')}\n`;
      } else if (row.roles && typeof row.roles === 'string') {
        dumpContent += `  TO ${row.roles}\n`;
      }
      if (row.qual) {
        dumpContent += `  USING (${row.qual})\n`;
      }
      if (row.with_check) {
        dumpContent += `  WITH CHECK (${row.with_check})\n`;
      }
      dumpContent += `;\n\n`;
    }
    console.log(`   ✓ ${policies.rows.length} polic(ies/y)\n`);

    // 6. TRIGGERS
    console.log('📥 Baixando triggers...');
    const triggersQuery = `
      SELECT pg_get_triggerdef(t.oid) as definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
      ORDER BY c.relname, t.tgname;
    `;
    const triggers = await client.query(triggersQuery);
    dumpContent += `\n-- ============================================\n`;
    dumpContent += `-- TRIGGERS\n`;
    dumpContent += `-- ============================================\n\n`;
    for (const row of triggers.rows) {
      dumpContent += `${row.definition};\n\n`;
    }
    console.log(`   ✓ ${triggers.rows.length} trigger(s)\n`);

    // Salvar arquivo
    fs.writeFileSync(BACKUP_FILE, dumpContent, 'utf8');

    // Criar cópia "latest"
    const latestFile = path.join(BACKUP_DIR, 'backup_latest.sql');
    fs.copyFileSync(BACKUP_FILE, latestFile);

    const stats = fs.statSync(BACKUP_FILE);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log('============================================');
    console.log('✅ Backup criado com sucesso!');
    console.log('📁 Arquivo:', BACKUP_FILE);
    console.log('📊 Tamanho:', sizeKB, 'KB');
    console.log('📁 Cópia:', latestFile);
    console.log('============================================\n');
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar
backup();
