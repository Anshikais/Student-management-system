process.env.NODE_ENV = 'test';

import app from './server.js';
import db from './config/db.js';
import http from 'http';

// Safety timeout: fail test if not completed within 15 seconds
const timeoutHandle = setTimeout(() => {
  console.error('❌ Test suite timed out after 15 seconds!');
  process.exit(1);
}, 15000);
timeoutHandle.unref();

let server;
const PORT = 5005;

async function runTests() {
  // Ensure DB is initialized before testing
  await db.initDb();

  // Start dedicated test server
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  console.log(`Test server active on port ${PORT}...`);

  const request = async (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const headers = {
        'Content-Type': 'application/json'
      };
      if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request({
        host: 'localhost',
        port: PORT,
        path: '/api' + path,
        method,
        headers,
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error(`HTTP request to ${path} timed out`));
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  try {
    // 1. Health check
    console.log('1. Health endpoint...');
    const health = await request('GET', '/health');
    if (health.status !== 200) throw new Error(`Health status expected 200, got ${health.status}`);
    console.log('   ✓ Health OK');

    // 2. Admin Login
    console.log('2. Admin Login...');
    const adminLogin = await request('POST', '/auth/login', {
      email: 'admin@joineazy.edu',
      password: 'Admin@123'
    });
    if (adminLogin.status !== 200 || adminLogin.body?.data?.user?.role !== 'admin') {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.body)}`);
    }
    console.log('   ✓ Admin login OK (Role: admin)');

    // 3. Student Leader Login
    console.log('3. Student Leader Login...');
    const studentLogin = await request('POST', '/auth/login', {
      email: 'leader@joineazy.edu',
      password: 'Student@123'
    });
    if (studentLogin.status !== 200 || !studentLogin.body?.data?.user?.group?.is_leader) {
      throw new Error(`Student leader login failed: ${JSON.stringify(studentLogin.body)}`);
    }
    const studentToken = studentLogin.body.data.token;
    console.log('   ✓ Student leader login OK (Group: Alpha Innovators)');

    // 4. Invalid Login
    console.log('4. Invalid Password...');
    const invalidLogin = await request('POST', '/auth/login', {
      email: 'admin@joineazy.edu',
      password: 'WrongPassword'
    });
    if (invalidLogin.status !== 401) throw new Error(`Expected 401, got ${invalidLogin.status}`);
    console.log('   ✓ Invalid credentials rejected with 401');

    // 5. Auth /me with token
    console.log('5. GET /api/auth/me (authenticated)...');
    const meRes = await request('GET', '/auth/me', null, studentToken);
    if (meRes.status !== 200 || meRes.body?.data?.user?.email !== 'leader@joineazy.edu') {
      throw new Error(`GET /api/auth/me failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log('   ✓ User profile retrieved successfully');

    // 6. Auth /me without token
    console.log('6. GET /api/auth/me (unauthenticated)...');
    const unauthRes = await request('GET', '/auth/me');
    if (unauthRes.status !== 401) throw new Error(`Expected 401, got ${unauthRes.status}`);
    console.log('   ✓ Unauthenticated request rejected with 401');

    // 7. Student Registration
    console.log('7. Student Registration (with role escalation prevention)...');
    const regRes = await request('POST', '/auth/register', {
      name: 'Grace Hopper',
      email: 'grace@joineazy.edu',
      student_id: 'STU-9999',
      password: 'Student@123',
      role: 'admin' // Attempting privilege escalation
    });
    if (regRes.status !== 201 || regRes.body?.data?.user?.role !== 'student') {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
    }
    console.log('   ✓ Student registered with role "student" (admin attempt overridden)');

    // 8. Duplicate Registration Prevention
    console.log('8. Duplicate Registration Prevention...');
    const dupRes = await request('POST', '/auth/register', {
      name: 'Grace Duplicate',
      email: 'grace@joineazy.edu',
      student_id: 'STU-9999',
      password: 'Student@123'
    });
    if (dupRes.status !== 409) throw new Error(`Expected 409, got ${dupRes.status}`);
    console.log('   ✓ Duplicate registration rejected with 409 Conflict');

    console.log('\n🎉 ALL 8 AUTHENTICATION TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    if (server) {
      await new Promise(r => server.close(r));
    }
    await db.closePool();
    clearTimeout(timeoutHandle);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Test Suite Failed:', err);
  if (server) server.close();
  clearTimeout(timeoutHandle);
  process.exit(1);
});