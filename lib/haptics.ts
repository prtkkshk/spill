// Haptic Vibrations Helper for Mobile Browsers

export function triggerHaptic(pattern: number | number[] = 15) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore unsupported browser environments
    }
  }
}
