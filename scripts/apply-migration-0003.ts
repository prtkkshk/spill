import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, serviceKey);

async function applyMigration() {
  const sql = `
    ALTER TABLE recordings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  `;
  console.log('Attempting RPC or query...');
  const res = await supabase.rpc('exec_sql', { sql_query: sql });
  console.log('RPC result:', res);
}

applyMigration();
