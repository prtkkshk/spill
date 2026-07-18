import { getSupabaseService } from '../lib/supabase';

async function main() {
  const supabase = getSupabaseService();
  try {
    const { data, error } = await supabase.from('tasks').select('*').limit(1);
    if (error) {
      console.error('Error querying tasks table:', error.message);
      process.exit(1);
    } else {
      console.log('Successfully connected and queried tasks. Table exists.');
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Error connecting to database:', err.message || err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
