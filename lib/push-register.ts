function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush() {
  if (
    typeof window === 'undefined' || 
    !('serviceWorker' in navigator) || 
    !('PushManager' in window)
  ) {
    console.log('Push messaging is not supported in this browser environment');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if subscription already exists
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Existing push subscription found on client.');
      await sendSubscriptionToServer(existingSubscription);
      return;
    }

    // Only prompt for subscription if permission is not denied
    if (Notification.permission === 'denied') {
      console.log('Notification permission is denied by the user');
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not available in environment variables');
      return;
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    console.log('Requesting push subscription registration...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    console.log('Push subscription generated successfully.');
    await sendSubscriptionToServer(subscription);
  } catch (error: any) {
    console.error('Failed to subscribe user to push:', error);
  }
}

async function sendSubscriptionToServer(subscription: PushSubscription) {
  try {
    const keyObj = subscription.toJSON();
    if (!keyObj.keys || !keyObj.keys.p256dh || !keyObj.keys.auth) {
      console.error('Subscription key data is incomplete');
      return;
    }

    const response = await fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: keyObj.keys.p256dh,
          auth: keyObj.keys.auth,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Backend failed to save subscription');
    }
    console.log('Subscription successfully synchronized with backend.');
  } catch (err: any) {
    console.error('Failed to send push subscription to server:', err.message || err);
  }
}
