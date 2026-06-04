/**
 * Retry helper utilities for Playwright tests
 * Provides exponential backoff and resilient error handling
 */

export class RetryHelper {
  /**
   * Retry a function with exponential backoff
   * @param fn - Function to retry
   * @param maxRetries - Maximum number of retries
   * @param baseDelay - Base delay in milliseconds
   * @param maxDelay - Maximum delay in milliseconds
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        console.log(`Retry attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Retry with specific error condition
   * @param fn - Function to retry
   * @param shouldRetry - Function to determine if error should be retried
   * @param maxRetries - Maximum number of retries
   */
  static async retryWithCondition<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: Error) => boolean,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries || !shouldRetry(lastError as Error)) {
          throw lastError;
        }
        
        // Wait before retry
        const delay = 1000 * attempt;
        console.log(`Retry attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Wait for condition with timeout
   * @param condition - Function that returns boolean
   * @param timeout - Timeout in milliseconds
   * @param message - Optional message for logging
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number,
    message?: string
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (error) {
        console.log(`Condition check failed:`, error);
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Timeout waiting for condition${message ? ': ' + message : ''}`);
  }

  /**
   * Safe navigation with retry
   * @param page - Playwright page
   * @param url - URL to navigate to
   * @param options - Navigation options
   */
  static async safeNavigate(
    page: any,
    url: string,
    options: any = {}
  ) {
    return this.retryWithCondition(async () => {
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 10000,
        ...options 
      });
      
      if (!response || response.status() !== 200) {
        throw new Error(`Navigation failed: ${response?.status()}`);
      }
      
      return response;
    }, (error: Error) => {
      // Retry on network errors and timeouts
      return error.message.includes('net::') || 
             error.message.includes('Timeout') ||
             error.message.includes('Navigation failed');
    }, 3);
  }

  /**
   * Safe API call with retry
   * @param page - Playwright page
   * @param url - API URL
   */
  static async safeApiCall(
    page: any,
    url: string
  ) {
    return this.retry(async () => {
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      if (!response) {
        throw new Error('No response received');
      }
      
      const status = response.status();
      if (status !== 200) {
        throw new Error(`API returned status ${status}`);
      }
      
      return response;
    }, 3);
  }
}
