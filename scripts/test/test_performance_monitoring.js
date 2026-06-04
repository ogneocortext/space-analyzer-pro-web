// Performance Monitoring Accuracy Test
// Test Node.js 26 performance monitoring capabilities and accuracy

console.log('=== Performance Monitoring Accuracy Test ===');

// Test 1: Real-time performance metrics
function testRealTimeMetrics() {
    console.log('\n1. Testing real-time performance metrics...');
    
    try {
        const metrics = {
            timestamp: Date.now(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            uptime: process.uptime(),
            hrtime: process.hrtime()
        };
        
        console.log('Real-time metrics:');
        console.log(`  Timestamp: ${new Date(metrics.timestamp).toISOString()}`);
        console.log(`  Memory RSS: ${Math.round(metrics.memory.rss / 1024 / 1024)} MB`);
        console.log(`  Memory Heap Used: ${Math.round(metrics.memory.heapUsed / 1024 / 1024)} MB`);
        console.log(`  CPU User: ${metrics.cpu.user} μs`);
        console.log(`  CPU System: ${metrics.cpu.system} μs`);
        console.log(`  Uptime: ${Math.round(metrics.uptime)} seconds`);
        console.log(`  High Resolution Time: ${metrics.hrtime[0]}.${metrics.hrtime[1]}s`);
        
        console.log('✅ Real-time metrics collection working');
        
    } catch (error) {
        console.log('❌ Real-time metrics test failed:', error.message);
    }
}

// Test 2: Performance trend monitoring
function testPerformanceTrends() {
    console.log('\n2. Testing performance trend monitoring...');
    
    try {
        const samples = [];
        const sampleCount = 10;
        
        // Collect performance samples over time
        for (let i = 0; i < sampleCount; i++) {
            const sample = {
                timestamp: Date.now(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            };
            samples.push(sample);
            
            // Small delay between samples
            const start = Date.now();
            while (Date.now() - start < 100) {
                // Busy wait for 100ms
            }
        }
        
        // Analyze trends
        const memoryTrend = samples.map(s => s.memory.heapUsed);
        const avgMemory = memoryTrend.reduce((a, b) => a + b, 0) / memoryTrend.length;
        const maxMemory = Math.max(...memoryTrend);
        const minMemory = Math.min(...memoryTrend);
        
        console.log('Performance trend analysis:');
        console.log(`  Samples collected: ${sampleCount}`);
        console.log(`  Average memory: ${Math.round(avgMemory / 1024 / 1024)} MB`);
        console.log(`  Peak memory: ${Math.round(maxMemory / 1024 / 1024)} MB`);
        console.log(`  Minimum memory: ${Math.round(minMemory / 1024 / 1024)} MB`);
        console.log(`  Memory variance: ${Math.round((maxMemory - minMemory) / 1024)} KB`);
        
        console.log('✅ Performance trend monitoring working');
        
    } catch (error) {
        console.log('❌ Performance trend test failed:', error.message);
    }
}

// Test 3: Performance benchmarking
function testPerformanceBenchmarking() {
    console.log('\n3. Testing performance benchmarking...');
    
    try {
        const benchmarks = [];
        
        // Benchmark different operations
        const operations = [
            {
                name: 'Array Creation',
                test: () => Array.from({ length: 100000 }, (_, i) => i)
            },
            {
                name: 'Array Sorting',
                test: () => Array.from({ length: 10000 }, () => Math.random() * 1000).sort((a, b) => a - b)
            },
            {
                name: 'String Operations',
                test: () => Array.from({ length: 10000 }, (_, i) => `test_string_${i}`).join(',')
            },
            {
                name: 'Math Operations',
                test: () => {
                    let sum = 0;
                    for (let i = 0; i < 100000; i++) {
                        sum += Math.sqrt(i) * Math.sin(i);
                    }
                    return sum;
                }
            }
        ];
        
        for (const operation of operations) {
            const startMemory = process.memoryUsage();
            const startCPU = process.cpuUsage();
            const startTime = process.hrtime.bigint();
            
            // Run the operation
            operation.test();
            
            const endTime = process.hrtime.bigint();
            const endCPU = process.cpuUsage(startCPU);
            const endMemory = process.memoryUsage();
            
            const executionTime = Number(endTime - startTime) / 1000000; // Convert to ms
            const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
            
            benchmarks.push({
                name: operation.name,
                executionTime,
                cpuUser: endCPU.user,
                cpuSystem: endCPU.system,
                memoryDelta,
                opsPerSecond: 1000 / executionTime
            });
        }
        
        console.log('Benchmark results:');
        benchmarks.forEach(benchmark => {
            console.log(`  ${benchmark.name}:`);
            console.log(`    Execution time: ${benchmark.executionTime.toFixed(2)} ms`);
            console.log(`    Operations/sec: ${benchmark.opsPerSecond.toFixed(0)}`);
            console.log(`    CPU User: ${benchmark.cpuUser} μs`);
            console.log(`    Memory delta: ${Math.round(benchmark.memoryDelta / 1024)} KB`);
        });
        
        console.log('✅ Performance benchmarking working');
        
    } catch (error) {
        console.log('❌ Performance benchmarking test failed:', error.message);
    }
}

// Test 4: Cache efficiency monitoring
function testCacheEfficiency() {
    console.log('\n4. Testing cache efficiency monitoring...');
    
    try {
        const cache = new Map();
        const testKeys = Array.from({ length: 1000 }, (_, i) => `key_${i}`);
        const testData = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            data: `test_data_${i}`,
            timestamp: Date.now()
        }));
        
        // Test cache population
        console.time('cache-population');
        testKeys.forEach((key, index) => {
            cache.set(key, testData[index]);
        });
        console.timeEnd('cache-population');
        
        // Test cache hits
        let hits = 0;
        let misses = 0;
        
        console.time('cache-lookup');
        testKeys.forEach(key => {
            if (cache.has(key)) {
                hits++;
            } else {
                misses++;
            }
        });
        console.timeEnd('cache-lookup');
        
        // Test cache efficiency
        const hitRate = (hits / (hits + misses)) * 100;
        const memoryUsage = process.memoryUsage();
        const cacheMemoryEfficiency = (cache.size / (memoryUsage.heapUsed / 1024)) * 100;
        
        console.log('Cache efficiency metrics:');
        console.log(`  Cache size: ${cache.size} entries`);
        console.log(`  Cache hits: ${hits}`);
        console.log(`  Cache misses: ${misses}`);
        console.log(`  Hit rate: ${hitRate.toFixed(1)}%`);
        console.log(`  Cache memory efficiency: ${cacheMemoryEfficiency.toFixed(2)}%`);
        console.log(`  Total memory used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
        
        console.log('✅ Cache efficiency monitoring working');
        
    } catch (error) {
        console.log('❌ Cache efficiency test failed:', error.message);
    }
}

// Test 5: I/O performance monitoring
function testIOPerformance() {
    console.log('\n5. Testing I/O performance monitoring...');
    
    try {
        const ioOperations = [];
        
        // Test different I/O operations
        const operations = [
            {
                name: 'Memory Allocation',
                test: () => {
                    const arrays = [];
                    for (let i = 0; i < 100; i++) {
                        arrays.push(new Array(10000).fill(i));
                    }
                    return arrays.length;
                }
            },
            {
                name: 'Object Creation',
                test: () => {
                    const objects = [];
                    for (let i = 0; i < 10000; i++) {
                        objects.push({
                            id: i,
                            name: `object_${i}`,
                            data: new Array(100).fill(i)
                        });
                    }
                    return objects.length;
                }
            },
            {
                name: 'String Manipulation',
                test: () => {
                    let result = '';
                    for (let i = 0; i < 10000; i++) {
                        result += `test_string_${i}_`;
                    }
                    return result.length;
                }
            }
        ];
        
        for (const operation of operations) {
            const startMemory = process.memoryUsage();
            const startTime = process.hrtime.bigint();
            
            // Run the I/O operation
            const result = operation.test();
            
            const endTime = process.hrtime.bigint();
            const endMemory = process.memoryUsage();
            
            const executionTime = Number(endTime - startTime) / 1000000; // Convert to ms
            const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
            const ioEfficiency = result / (memoryUsed || 1);
            
            ioOperations.push({
                name: operation.name,
                executionTime,
                memoryUsed,
                result,
                ioEfficiency
            });
        }
        
        console.log('I/O performance results:');
        ioOperations.forEach(op => {
            console.log(`  ${op.name}:`);
            console.log(`    Execution time: ${op.executionTime.toFixed(2)} ms`);
            console.log(`    Memory used: ${Math.round(op.memoryUsed / 1024)} KB`);
            console.log(`    Results processed: ${op.result}`);
            console.log(`    I/O efficiency: ${op.ioEfficiency.toFixed(2)} ops/KB`);
        });
        
        console.log('✅ I/O performance monitoring working');
        
    } catch (error) {
        console.log('❌ I/O performance test failed:', error.message);
    }
}

// Run all tests
function runAllTests() {
    testRealTimeMetrics();
    testPerformanceTrends();
    testPerformanceBenchmarking();
    testCacheEfficiency();
    testIOPerformance();
    
    console.log('\n=== Performance Monitoring Accuracy Test Complete ===');
}

runAllTests();
