/**
 * Global teardown for Playwright tests
 * Cleans up after tests
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Cleaning up after tests...');

  // Kill backend server if PID exists
  if (process.env.BACKEND_PID) {
    try {
      process.kill(parseInt(process.env.BACKEND_PID, 10), 'SIGTERM');
      console.log('✅ Backend server stopped');
    } catch (error) {
      console.error('Failed to stop backend server:', error);
    }
  }

  // Kill frontend server if PID exists
  if (process.env.FRONTEND_PID) {
    try {
      process.kill(parseInt(process.env.FRONTEND_PID, 10), 'SIGTERM');
      console.log('✅ Frontend server stopped');
    } catch (error) {
      console.error('Failed to stop frontend server:', error);
    }
  }

  console.log('✅ Test teardown complete');
}

export default globalTeardown;
