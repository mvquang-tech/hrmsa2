const fetch = require('node-fetch');

async function main() {
  const base = process.env.BASE_URL || 'http://localhost:3000';

  // Login as admin
  console.log('Logging in as admin...');
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  const token = loginData.data.token;
  console.log('Got token');

  // Create leave for employeeId 1 (has telegram configured)
  const payload = {
    employeeId: 1,
    type: 'personal',
    startDate: (new Date()).toISOString().split('T')[0],
    endDate: (new Date(Date.now() + 24*60*60*1000)).toISOString().split('T')[0],
    days: 1,
    reason: 'Test leave from automation',
  };

  console.log('Creating leave:', payload);
  const res = await fetch(`${base}/api/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log('Create response:', data);
}

main().catch(err => { console.error(err); process.exit(1); });