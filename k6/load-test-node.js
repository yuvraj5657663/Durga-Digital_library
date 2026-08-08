// Simple Node.js load test (alternative to k6)
const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TOTAL_REQUESTS = 50;
const CONCURRENT_REQUESTS = 5;

async function makeRequest() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    http.get(`${BASE_URL}/health`, (res) => {
      const duration = Date.now() - startTime;
      resolve({ 
        success: res.statusCode === 200, 
        statusCode: res.statusCode,
        duration 
      });
    }).on('error', (err) => {
      resolve({ 
        success: false, 
        error: err.message,
        duration: Date.now() - startTime 
      });
    });
  });
}

async function runLoadTest() {
  console.log('🚀 Starting Node.js Load Test');
  console.log(`📍 Target: ${BASE_URL}/health`);
  console.log(`📊 Total Requests: ${TOTAL_REQUESTS}`);
  console.log(`🔄 Concurrent: ${CONCURRENT_REQUESTS}`);
  console.log('---');

  const results = [];
  let completed = 0;

  // Run in batches
  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENT_REQUESTS) {
    const batch = [];
    const batchSize = Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - i);
    
    for (let j = 0; j < batchSize; j++) {
      batch.push(makeRequest());
    }

    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    completed += batchSize;
    
    // Progress
    const successCount = results.filter(r => r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    console.log(`Progress: ${completed}/${TOTAL_REQUESTS} | Success: ${successCount} | Avg: ${avgDuration.toFixed(2)}ms`);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Calculate statistics
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const successRate = (successCount / results.length) * 100;
  const durations = results.map(r => r.duration);
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);
  const sortedDurations = durations.sort((a, b) => a - b);
  const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];

  console.log('\n--- Load Test Results ---');
  console.log(`✅ Success Rate: ${successRate.toFixed(2)}% (${successCount}/${results.length})`);
  console.log(`❌ Failure Rate: ${((100 - successRate).toFixed(2))}% (${failureCount}/${results.length})`);
  console.log(`⏱️  Avg Response Time: ${avgDuration.toFixed(2)}ms`);
  console.log(`⏱️  Min Response Time: ${minDuration.toFixed(2)}ms`);
  console.log(`⏱️  Max Response Time: ${maxDuration.toFixed(2)}ms`);
  console.log(`⏱️  95th Percentile: ${p95.toFixed(2)}ms`);
  
  if (successRate >= 95 && p95 < 1000) {
    console.log('\n✅ Load test PASSED - System is performing well!');
  } else {
    console.log('\n⚠️  Load test FAILED - Performance or reliability issues detected');
  }
}

runLoadTest().catch(console.error);