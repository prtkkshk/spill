import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import webpush from 'web-push';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // 1. Guard check: Require secret in header
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized attempt to trigger daily-reminder cron');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseService();

    // 2. Fetch pending tasks count
    const { count: pendingCount, error: countError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (countError) {
      console.error('Failed to get pending tasks count:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const count = pendingCount || 0;

    // If there are no pending tasks, we can skip sending pushes or send an encouraging push
    const messagePayload = JSON.stringify({
      title: 'FocusFlow Reminder',
      body: count > 0 
        ? `You have ${count} pending task${count > 1 ? 's' : ''} waiting. Ready to tackle them?` 
        : 'Your task list is completely clear. Have a great day!',
      icon: '/icons/icon-192.jpg',
      badge: '/icons/icon-192.jpg',
    });

    // 3. Fetch all subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subsError) {
      console.error('Failed to query push subscriptions:', subsError);
      return NextResponse.json({ error: subsError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'No subscriptions found, skipping notifications.' });
    }

    // Configure web-push with VAPID keys
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublic || !vapidPrivate) {
      throw new Error('VAPID public or private key environment variables are missing');
    }

    webpush.setVapidDetails(
      'mailto:prtkkshkram@gmail.com', // Contact email
      vapidPublic,
      vapidPrivate
    );

    // 4. Send pushes in parallel, gathering results
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, messagePayload);
          return { endpoint: sub.endpoint, status: 'sent' };
        } catch (pushErr: any) {
          // If subscription has expired or is no longer valid, delete it from the database
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            console.log(`Pruning expired subscription for endpoint: ${sub.endpoint}`);
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            return { endpoint: sub.endpoint, status: 'pruned' };
          }
          throw pushErr;
        }
      })
    );

    const summary = results.reduce(
      (acc, res) => {
        if (res.status === 'fulfilled') {
          if (res.value.status === 'sent') acc.sent++;
          if (res.value.status === 'pruned') acc.pruned++;
        } else {
          acc.failed++;
          console.error('Push notification failed:', res.reason);
        }
        return acc;
      },
      { sent: 0, pruned: 0, failed: 0 }
    );

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('Route error in /api/cron/daily-reminder:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
export async function GET(req: Request) {
  // Support GET triggers for easier manual browser/curl testing (still requires secret)
  return POST(req);
}
