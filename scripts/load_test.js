import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 options defining virtual users, duration, and performance thresholds
export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must complete below 200ms
    http_req_failed: ['rate<0.01'],    // error rate must be less than 1%
  },
};

// Setup function to authenticate and obtain the JWT token once before the test begins
export function setup() {
  const loginUrl = 'http://localhost:8000/api/auth/login/';
  const payload = JSON.stringify({
    username: __ENV.TEST_USERNAME || 'root',
    password: __ENV.TEST_PASSWORD || 'changeme',
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const res = http.post(loginUrl, payload, params);
  const token = res.json().token;
  return { token: token };
}

export default function (data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  // Load test the Go Search Microservice endpoint directly on port 8080
  const res = http.get('http://localhost:8080/api/go/search?q=R', params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.1); // Add a small sleep delay to space requests realistically
}
