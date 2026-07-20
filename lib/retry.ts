// Exponential Backoff & Retry Helper for API & LLM calls

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000,
  backoffFactor: number = 2
): Promise<T> {
  let attempt = 0;
  let currentDelay = delayMs;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt >= retries) {
        console.error(`Attempt ${attempt}/${retries} failed permanently:`, error.message || error);
        throw error;
      }
      console.warn(`Attempt ${attempt}/${retries} failed (${error.message}). Retrying in ${currentDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
    }
  }

  throw new Error('Retry limit reached');
}
