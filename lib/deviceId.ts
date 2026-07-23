/**
 * Manages device-level storage isolation for unauthenticated users.
 * Generates a persistent UUID stored in localStorage so guests get their own private workspace.
 */

export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    let deviceId = localStorage.getItem('spill_device_id');
    if (!deviceId) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        deviceId = `dev_${crypto.randomUUID()}`;
      } else {
        deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      localStorage.setItem('spill_device_id', deviceId);
    }
    return deviceId;
  } catch (e) {
    console.warn('Unable to access localStorage for spill_device_id:', e);
    return 'dev_fallback_guest';
  }
}

export function getDeviceIdHeader(): Record<string, string> {
  const id = getDeviceId();
  return id ? { 'x-device-id': id } : {};
}
