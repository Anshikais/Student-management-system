process.env.NODE_ENV = 'test';

import app from './server.js';
import db from './config/db.js';
import http from 'http';

const timeoutHandle = setTimeout(() => {
  console.error('❌ Test suite timed out after 15 seconds!');
  process.exit(1);
}, 15000);
timeoutHandle.unref();

let server;
const PORT = 5006;

async function runTests() {
  await db.initDb();

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  console.log(`Test server running on port ${PORT}...`);

  const request = async (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const headers = { 'Content-Type': 'application/json' };
      if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request({
        host: '127.0.0.1',
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

      req.on('timeout', () => req.destroy(new Error(`Timeout on ${path}`)));
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  try {
    console.log('--- Setting up test authentication tokens ---');
    // Login Admin
    const adminLogin = await request('POST', '/auth/login', {
      email: 'admin@joineazy.edu',
      password: 'Admin@123'
    });
    const adminToken = adminLogin.body.data.token;

    // Login Emma (unassigned student)
    const emmaLogin = await request('POST', '/auth/login', {
      email: 'emma@joineazy.edu',
      password: 'Student@123'
    });
    const emmaToken = emmaLogin.body.data.token;
    const emmaId = emmaLogin.body.data.user.id;

    // Register 2 new test students (Clara & David)
    const claraReg = await request('POST', '/auth/register', {
      name: 'Clara Oswald',
      email: 'clara@joineazy.edu',
      student_id: 'STU-7001',
      password: 'Student@123'
    });
    const claraToken = claraReg.body.data.token;
    const claraId = claraReg.body.data.user.id;

    const davidReg = await request('POST', '/auth/register', {
      name: 'David Tennant',
      email: 'david@joineazy.edu',
      student_id: 'STU-7002',
      password: 'Student@123'
    });
    const davidId = davidReg.body.data.user.id;

    console.log('\n1. Test Group Creation & Automatic Leader Assignment');
    const createRes = await request('POST', '/groups', {
      name: 'Gamma Pioneers'
    }, emmaToken);

    if (createRes.status !== 201) throw new Error(`Group creation failed: ${JSON.stringify(createRes.body)}`);
    const group = createRes.body.data.group;
    const groupId = group.id;
    console.log(`   ✓ Created group "${group.name}" with ID ${groupId} and Code "${group.group_code}"`);
    if (group.leader_id !== emmaId || !group.is_leader) {
      throw new Error(`Creator was not assigned as leader`);
    }
    if (group.members.length !== 1 || group.members[0].user_id !== emmaId) {
      throw new Error(`Creator was not auto-added to members list`);
    }
    console.log(`   ✓ Leader automatically assigned to Emma (user_id: ${emmaId})`);

    console.log('\n2. Test Preventing Multiple Active Groups');
    const multiGroupRes = await request('POST', '/groups', {
      name: 'Emma Second Group'
    }, emmaToken);
    if (multiGroupRes.status !== 400) throw new Error(`Expected 400 for multiple group creation, got ${multiGroupRes.status}`);
    console.log(`   ✓ Prevented student from creating a second group (status 400)`);

    console.log('\n3. Test Adding Members (by Email and by Student ID)');
    // Add Clara by email
    const addClaraRes = await request('POST', `/groups/${groupId}/members`, {
      identifier: 'clara@joineazy.edu'
    }, emmaToken);
    if (addClaraRes.status !== 201) throw new Error(`Add member by email failed: ${JSON.stringify(addClaraRes.body)}`);
    console.log(`   ✓ Added Clara by email (status 201)`);

    // Add David by student ID
    const addDavidRes = await request('POST', `/groups/${groupId}/members`, {
      identifier: 'STU-7002'
    }, emmaToken);
    if (addDavidRes.status !== 201) throw new Error(`Add member by student_id failed: ${JSON.stringify(addDavidRes.body)}`);
    console.log(`   ✓ Added David by Student ID (status 201)`);

    console.log('\n4. Test Duplicate Membership Prevention');
    const dupMemberRes = await request('POST', `/groups/${groupId}/members`, {
      identifier: 'clara@joineazy.edu'
    }, emmaToken);
    if (dupMemberRes.status !== 409) throw new Error(`Expected 409 Conflict, got ${dupMemberRes.status}`);
    console.log(`   ✓ Duplicate member addition rejected with 409 Conflict`);

    console.log('\n5. Test Adding Student Already in Another Active Group');
    const crossGroupRes = await request('POST', `/groups/${groupId}/members`, {
      identifier: 'john@joineazy.edu' // John belongs to Alpha Innovators
    }, emmaToken);
    if (crossGroupRes.status !== 409) throw new Error(`Expected 409 Conflict for existing group member, got ${crossGroupRes.status}`);
    console.log(`   ✓ Prevented adding student belonging to another group (status 409)`);

    console.log('\n6. Test Unauthorized Membership Changes');
    // Clara (regular member) attempts to add someone
    const unauthAddRes = await request('POST', `/groups/${groupId}/members`, {
      identifier: 'bob@joineazy.edu'
    }, claraToken);
    if (unauthAddRes.status !== 403) throw new Error(`Expected 403 Forbidden, got ${unauthAddRes.status}`);
    console.log(`   ✓ Non-leader member cannot add members (status 403)`);

    // Clara attempts to remove David
    const unauthRemoveRes = await request('DELETE', `/groups/${groupId}/members/${davidId}`, null, claraToken);
    if (unauthRemoveRes.status !== 403) throw new Error(`Expected 403 Forbidden, got ${unauthRemoveRes.status}`);
    console.log(`   ✓ Non-leader member cannot remove members (status 403)`);

    console.log('\n7. Test Removing Members & Leader Self-Removal Guard');
    // Leader Emma tries to remove herself
    const selfRemoveRes = await request('DELETE', `/groups/${groupId}/members/${emmaId}`, null, emmaToken);
    if (selfRemoveRes.status !== 400) throw new Error(`Expected 400 for leader self-removal, got ${selfRemoveRes.status}`);
    console.log(`   ✓ Leader cannot remove themselves (status 400)`);

    // Leader Emma removes David
    const removeDavidRes = await request('DELETE', `/groups/${groupId}/members/${davidId}`, null, emmaToken);
    if (removeDavidRes.status !== 200) throw new Error(`Expected 200 for member removal, got ${removeDavidRes.status}`);
    console.log(`   ✓ Leader successfully removed David (status 200)`);

    console.log('\n8. Test Group Retrieval & Authorization');
    // Emma views her own group
    const emmaGroupRes = await request('GET', '/groups', null, emmaToken);
    if (emmaGroupRes.status !== 200 || !emmaGroupRes.body.data.group) {
      throw new Error(`Student failed to get own group`);
    }
    console.log(`   ✓ Student retrieved own group with ${emmaGroupRes.body.data.group.members.length} members`);

    // Emma attempts to view Group 1 (Alpha Innovators)
    const unauthorizedGroupView = await request('GET', '/groups/1', null, emmaToken);
    if (unauthorizedGroupView.status !== 403) throw new Error(`Expected 403 viewing another group, got ${unauthorizedGroupView.status}`);
    console.log(`   ✓ Student cannot view another group's details (status 403)`);

    // Admin Alan Turing views all groups
    const adminGroupsRes = await request('GET', '/groups', null, adminToken);
    if (adminGroupsRes.status !== 200 || !Array.isArray(adminGroupsRes.body.data.groups)) {
      throw new Error(`Admin failed to get all groups`);
    }
    console.log(`   ✓ Admin retrieved all ${adminGroupsRes.body.data.groups.length} groups with member counts`);

    // Admin views any group by ID
    const adminGroupView = await request('GET', `/groups/${groupId}`, null, adminToken);
    if (adminGroupView.status !== 200 || adminGroupView.body.data.group.id !== groupId) {
      throw new Error(`Admin failed to view group by ID`);
    }
    console.log(`   ✓ Admin can view any group by ID (status 200)`);

    console.log('\n🎉 ALL PHASE 4 GROUP TESTS PASSED WITH 100% SUCCESS AGAINST REAL POSTGRESQL!');
  } finally {
    if (server) await new Promise(r => server.close(r));
    await db.closePool();
    clearTimeout(timeoutHandle);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Group Test Suite Failed:', err);
  if (server) server.close();
  clearTimeout(timeoutHandle);
  process.exit(1);
});