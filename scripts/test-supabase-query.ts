import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function test() {
  console.log('Testing GET query without user...');
  const res1 = await supabase.from('tasks').select('*').eq('status', 'pending').is('user_id', null);
  console.log('Res 1:', res1.error ? res1.error : `Found ${res1.data?.length} tasks`);

  console.log('\nTesting GET query WITH user.or()...');
  const fakeUserId = '00000000-0000-0000-0000-000000000000';
  const res2 = await supabase.from('tasks').select('*').eq('status', 'pending').or(`user_id.eq.${fakeUserId},user_id.is.null`);
  console.log('Res 2:', res2.error ? res2.error : `Found ${res2.data?.length} tasks`);
}

test();
