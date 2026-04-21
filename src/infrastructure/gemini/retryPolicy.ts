export type RetryOptions = {
  maxRetries: number;
  baseDelayMs: number;
  retryableKinds: ReadonlyArray<string>;
};

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  retryableKinds: ['RATE_LIMITED', 'SERVER_ERROR', 'TIMEOUT', 'NETWORK_ERROR'],
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_OPTIONS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const kind = (e as { kind?: string }).kind;
      if (!kind || !options.retryableKinds.includes(kind)) throw e;
      if (attempt === options.maxRetries) throw e;
      await new Promise((r) => setTimeout(r, options.baseDelayMs * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}
