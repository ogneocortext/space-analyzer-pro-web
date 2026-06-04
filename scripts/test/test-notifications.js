// Test script for notification system
// Run this in browser console to test notifications

console.log('🧪 Testing Notification System...');

// Test 1: Success notification
console.log('✅ Testing success notification...');
window.testSuccess = () => {
  const { useNotificationStore } = window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.Vue?.config?.globalProperties?.$store || {};
  if (window.notificationStore) {
    window.notificationStore.success('Test Success', 'This is a test success notification!');
  } else {
    console.log('Notification store not found, trying direct access...');
    // Try to access the notification store directly
    const app = document.querySelector('#app')?.__vue_app__;
    if (app) {
      const store = app._instance?.setupState?.notificationStore;
      if (store) {
        store.success('Test Success', 'This is a test success notification!');
      }
    }
  }
};

// Test 2: Error notification
console.log('❌ Testing error notification...');
window.testError = () => {
  const app = document.querySelector('#app')?.__vue_app__;
  if (app) {
    const store = app._instance?.setupState?.notificationStore;
    if (store) {
      store.error('Test Error', 'This is a test error notification!');
    }
  }
};

// Test 3: Warning notification
console.log('⚠️ Testing warning notification...');
window.testWarning = () => {
  const app = document.querySelector('#app')?.__vue_app__;
  if (app) {
    const store = app._instance?.setupState?.notificationStore;
    if (store) {
      store.warning('Test Warning', 'This is a test warning notification!');
    }
  }
};

// Test 4: Info notification
console.log('ℹ️ Testing info notification...');
window.testInfo = () => {
  const app = document.querySelector('#app')?.__vue_app__;
  if (app) {
    const store = app._instance?.setupState?.notificationStore;
    if (store) {
      store.info('Test Info', 'This is a test info notification!');
    }
  }
};

// Test 5: Multiple notifications
console.log('📋 Testing multiple notifications...');
window.testMultiple = () => {
  setTimeout(() => window.testSuccess(), 100);
  setTimeout(() => window.testError(), 600);
  setTimeout(() => window.testWarning(), 1100);
  setTimeout(() => window.testInfo(), 1600);
};

// Test 6: Scan completion simulation
console.log('🔍 Testing scan completion notification...');
window.testScanComplete = () => {
  const app = document.querySelector('#app')?.__vue_app__;
  if (app) {
    const store = app._instance?.setupState?.notificationStore;
    if (store) {
      store.success('Scan Complete! 🎉', 'Successfully scanned 1,234 files (45.6 MB) in 12 seconds');
    }
  }
};

console.log('🎯 Test functions ready!');
console.log('Available commands:');
console.log('  testSuccess() - Test success notification');
console.log('  testError() - Test error notification');
console.log('  testWarning() - Test warning notification');
console.log('  testInfo() - Test info notification');
console.log('  testMultiple() - Test multiple notifications');
console.log('  testScanComplete() - Test scan completion notification');