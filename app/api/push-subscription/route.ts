import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: 'Missing subscription details (endpoint, p256dh, auth)' }, { status: 400 });
    }

    const supabase = getSupabaseService();

    // Check if the subscription already exists to avoid duplicates
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Subscription already exists' });
    }

    // Insert new subscription
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert push subscription:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscription: data,
    });
  } catch (error: any) {
    console.error('Route error in /api/push-subscription:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
