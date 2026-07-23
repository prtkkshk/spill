import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Client for use in browser components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for use on the server only (Route Handlers) using service_role key
export const getSupabaseService = () => {
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env variable');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Helper to extract and verify authenticated user from request Authorization header
export async function getAuthUser(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7).trim();
    if (!token) return null;

    const supabase = getSupabaseService();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (err) {
    return null;
  }
}

// Helper to extract device_id header from request
export function getDeviceIdFromReq(req: Request): string | null {
  try {
    const deviceId = req.headers.get('x-device-id');
    if (!deviceId || typeof deviceId !== 'string') return null;
    return deviceId.trim() || null;
  } catch (err) {
    return null;
  }
}


