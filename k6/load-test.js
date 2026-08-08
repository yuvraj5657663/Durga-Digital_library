import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '5s', target: 1 },     // Ramp up to 1 user
    { duration: '10s', target: 1 },    // Stay at 1 user
    { duration: '5s', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2000ms
    http_req_failed: ['rate<0.2'],   // Error rate must be less than 20%
    errors: ['rate<0.2'],            // Custom error rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://127.0.0.1:3000';

export default function () {
  // Test health endpoint only (no auth required)
  const healthRes = http.get(`${BASE_URL}/health`, {
    timeout: '10s',
  });
  
  const isSuccessful = check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  if (!isSuccessful) {
    errorRate.add(1);
  }

  sleep(1);
}
