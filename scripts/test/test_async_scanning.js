// Async Directory Scanning Test
// Test Node.js 26 async patterns and performance

console.log('=== Async Directory Scanning Test ===');

// Test 1: Async file system operations
async function testAsyncFileSystem() {
    console.log('\n1. Testing async file system operations...');
    
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        // Test async directory reading
        const testDir = './test_scan_directory';
        const files = await fs.readdir(testDir);
        
        console.log(`✅ Async directory read: ${files.length} files found`);
        
        // Test async file stats
        for (const file of files.slice(0, 3)) {
            const filePath = path.join(testDir, file);
            const stats = await fs.stat(filePath);
            console.log(`  ${file}: ${stats.size} bytes`);
        }
        
        console.log('✅ Async file operations work correctly');
        
    } catch (error) {
        console.log('❌ Async file system test failed:', error.message);
    }
}

// Test 2: Non-blocking behavior
async function testNonBlockingBehavior() {
    console.log('\n2. Testing non-blocking behavior...');
    
    try {
        let counter = 0;
        const interval = setInterval(() => {
            counter++;
            console.log(`  UI still responsive... (${counter}s)`);
        }, 1000);
        
        // Simulate async scanning
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        clearInterval(interval);
        console.log('✅ Non-blocking behavior confirmed');
        
    } catch (error) {
        console.log('❌ Non-blocking test failed:', error.message);
    }
}

// Test 3: Performance comparison
async function testPerformanceComparison() {
    console.log('\n3. Testing performance comparison...');
    
    try {
        const fs = require('fs').promises;
        const testDir = './test_scan_directory';
        
        // Test sync vs async performance
        console.time('sync-operations');
        const syncFiles = require('fs').readdirSync(testDir);
        console.timeEnd('sync-operations');
        
        console.time('async-operations');
        const asyncFiles = await fs.readdir(testDir);
        console.timeEnd('async-operations');
        
        console.log(`✅ Sync: ${syncFiles.length} files, Async: ${asyncFiles.length} files`);
        console.log('✅ Performance comparison completed');
        
    } catch (error) {
        console.log('❌ Performance comparison failed:', error.message);
    }
}

// Test 4: Memory efficiency during async operations
async function testMemoryEfficiency() {
    console.log('\n4. Testing memory efficiency...');
    
    try {
        const initialMemory = process.memoryUsage();
        console.log('Initial memory usage:');
        console.log(`  RSS: ${Math.round(initialMemory.rss / 1024 / 1024)} MB`);
        console.log(`  Heap Used: ${Math.round(initialMemory.heapUsed / 1024 / 1024)} MB`);
        
        // Simulate memory-intensive async operations
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(
                new Promise(resolve => {
                    setTimeout(() => {
                        // Simulate file processing
                        const data = new Array(1000).fill(i);
                        resolve(data.length);
                    }, Math.random() * 1000);
                })
            );
        }
        
        await Promise.all(promises);
        
        const finalMemory = process.memoryUsage();
        console.log('Final memory usage:');
        console.log(`  RSS: ${Math.round(finalMemory.rss / 1024 / 1024)} MB`);
        console.log(`  Heap Used: ${Math.round(finalMemory.heapUsed / 1024 / 1024)} MB`);
        
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        console.log(`Memory increase: ${Math.round(memoryIncrease / 1024)} KB`);
        
        console.log('✅ Memory efficiency test completed');
        
    } catch (error) {
        console.log('❌ Memory efficiency test failed:', error.message);
    }
}

// Test 5: Error handling in async operations
async function testAsyncErrorHandling() {
    console.log('\n5. Testing async error handling...');
    
    try {
        // Test with non-existent directory
        const fs = require('fs').promises;
        
        try {
            await fs.readdir('/non/existent/path');
            console.log('❌ Should have thrown an error');
        } catch (error) {
            console.log('✅ Async error handling works:', error.code);
        }
        
        // Test with invalid file operations
        try {
            await fs.readFile('/non/existent/file.txt');
            console.log('❌ Should have thrown an error');
        } catch (error) {
            console.log('✅ File read error handling works:', error.code);
        }
        
        console.log('✅ Async error handling completed');
        
    } catch (error) {
        console.log('❌ Async error handling test failed:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    await testAsyncFileSystem();
    await testNonBlockingBehavior();
    await testPerformanceComparison();
    await testMemoryEfficiency();
    await testAsyncErrorHandling();
    
    console.log('\n=== Async Directory Scanning Test Complete ===');
}

runAllTests().catch(console.error);
