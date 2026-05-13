/**
 * Fetch utility with exponential backoff retry logic.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<Response> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetch(url, options);
      
      // Retry on 5xx errors or 429 Too Many Requests
      if (response.status >= 500 || response.status === 429) {
        lastError = new Error(`Server returned status ${response.status}`);
        continue;
      }

      return response;
    } catch (error: any) {
      lastError = error;
      // Socket errors or fetch failures are retried automatically
      continue;
    }
  }

  throw lastError || new Error(`Fetch failed after ${maxRetries} retries`);
}
