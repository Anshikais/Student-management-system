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
const PORT = 5007;

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
    console.log('--- Setting up auth tokens ---');
    // Admin (Alan Turing)
    const adminLogin = await request('POST', '/auth/login', {
      email: 'admin@joineazy.edu',
      password: 'Admin@123'
    });
    const adminToken = adminLogin.body.data.token;

    // Student Sarah (Group 1 - Alpha Innovators)
    const sarahLogin = await request('POST', '/auth/login', {
      email: 'leader@joineazy.edu',
      password: 'Student@123'
    });
    const sarahToken = sarahLogin.body.data.token;

    // Student Bob (Group 2 - Beta Developers)
    const bobLogin = await request('POST', '/auth/login', {
      email: 'bob@joineazy.edu',
      password: 'Student@123'
    });
    const bobToken = bobLogin.body.data.token;

    console.log('\n1. Test Invalid OneDrive URL Rejection');
    const invalidUrlRes = await request('POST', '/assignments', {
      title: 'Invalid URL Assignment',
      description: 'Testing validation for onedrive link',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      onedrive_link: 'https://randomsite.com/document.docx',
      allocation_type: 'all'
    }, adminToken);
    if (invalidUrlRes.status !== 400) throw new Error(`Expected 400 for invalid OneDrive link, got ${invalidUrlRes.status}`);
    console.log('   ✓ Rejected non-OneDrive URL with 400');

    console.log('\n2. Test Admin Creates Assignment Allocated to All Students');
    const createAllRes = await request('POST', '/assignments', {
      title: 'Global Midterm Project',
      description: 'Comprehensive full-stack milestone for all enrolled students.',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      onedrive_link: 'https://1drv.ms/u/s!AmxYzGlobalMidtermFolder',
      allocation_type: 'all'
    }, adminToken);
    if (createAllRes.status !== 201) throw new Error(`Create assignment failed: ${JSON.stringify(createAllRes.body)}`);
    const globalAssignmentId = createAllRes.body.data.assignment.id;
    console.log(`   ✓ Admin created global assignment ID ${globalAssignmentId} (allocation: all)`);

    console.log('\n3. Test Student Cannot Create Assignment');
    const studentCreateRes = await request('POST', '/assignments', {
      title: 'Hacked Assignment',
      description: 'Unauthorized attempt',
      due_date: new Date().toISOString(),
      onedrive_link: 'https://1drv.ms/u/s!AmxYzTest',
      allocation_type: 'all'
    }, sarahToken);
    if (studentCreateRes.status !== 403) throw new Error(`Expected 403 for student create assignment, got ${studentCreateRes.status}`);
    console.log('   ✓ Student assignment creation rejected with 403 Forbidden');

    console.log('\n4. Test Admin Creates Assignment for Group 1 Only');
    const createGroupRes = await request('POST', '/assignments', {
      title: 'Alpha Innovators Special Lab',
      description: 'Exclusive research assignment allocated only to Group 1.',
      due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
      onedrive_link: 'https://1drv.ms/u/s!AmxYzAlphaSpecialFolder',
      allocation_type: 'groups',
      group_ids: [1]
    }, adminToken);
    if (createGroupRes.status !== 201) throw new Error(`Create group assignment failed: ${JSON.stringify(createGroupRes.body)}`);
    const group1AssignmentId = createGroupRes.body.data.assignment.id;
    console.log(`   ✓ Admin created group-specific assignment ID ${group1AssignmentId} (group_ids: [1])`);

    console.log('\n5. Test Assignment Visibility: All-Students vs Group-Specific');
    // Group 1 student (Sarah) lists assignments
    const sarahList = await request('GET', '/assignments', null, sarahToken);
    const sarahIds = sarahList.body.data.assignments.map(a => a.id);
    if (!sarahIds.includes(globalAssignmentId)) throw new Error('Sarah should see global assignment');
    if (!sarahIds.includes(group1AssignmentId)) throw new Error('Sarah should see Group 1 exclusive assignment');
    console.log(`   ✓ Group 1 student sees both Global and Group 1 assignments (count: ${sarahIds.length})`);

    // Group 2 student (Bob) lists assignments
    const bobList = await request('GET', '/assignments', null, bobToken);
    const bobIds = bobList.body.data.assignments.map(a => a.id);
    if (!bobIds.includes(globalAssignmentId)) throw new Error('Bob should see global assignment');
    if (bobIds.includes(group1AssignmentId)) throw new Error('Bob must NOT see Group 1 exclusive assignment!');
    console.log(`   ✓ Group 2 student sees Global assignment but CANNOT see Group 1 exclusive assignment`);

    // Bob attempts to view Group 1 assignment directly by ID
    const bobDirectView = await request('GET', `/assignments/${group1AssignmentId}`, null, bobToken);
    if (bobDirectView.status !== 403) throw new Error(`Expected 403 for student viewing other group assignment, got ${bobDirectView.status}`);
    console.log('   ✓ Student directly accessing other group assignment rejected with 403 Forbidden');

    console.log('\n6. Test Admin Edits Assignment');
    const updateRes = await request('PUT', `/assignments/${globalAssignmentId}`, {
      title: 'Global Midterm Project (Updated Specification)',
      description: 'Updated instructions for all students.'
    }, adminToken);
    if (updateRes.status !== 200 || !updateRes.body.data.assignment.title.includes('Updated Specification')) {
      throw new Error(`Update failed: ${JSON.stringify(updateRes.body)}`);
    }
    console.log('   ✓ Admin updated assignment successfully');

    console.log('\n7. Test Unauthorized Student Editing Rejected');
    const studentUpdateRes = await request('PUT', `/assignments/${globalAssignmentId}`, {
      title: 'Defaced Title'
    }, sarahToken);
    if (studentUpdateRes.status !== 403) throw new Error(`Expected 403 for student update, got ${studentUpdateRes.status}`);
    console.log('   ✓ Student editing assignment rejected with 403 Forbidden');

    console.log('\n8. Test Invalid Assignment IDs');
    const notFoundRes = await request('GET', '/assignments/99999', null, adminToken);
    if (notFoundRes.status !== 404) throw new Error(`Expected 404, got ${notFoundRes.status}`);
    const badParamRes = await request('GET', '/assignments/abc', null, adminToken);
    if (badParamRes.status !== 400) throw new Error(`Expected 400, got ${badParamRes.status}`);
    console.log('   ✓ Correctly returned 404 for missing ID and 400 for malformed ID');

    console.log('\n9. Test Admin Deletes Assignment');
    const deleteRes = await request('DELETE', `/assignments/${globalAssignmentId}`, null, adminToken);
    if (deleteRes.status !== 200) throw new Error(`Delete failed: ${JSON.stringify(deleteRes.body)}`);
    console.log('   ✓ Admin deleted assignment successfully');

    const verifyDelete = await request('GET', `/assignments/${globalAssignmentId}`, null, adminToken);
    if (verifyDelete.status !== 404) throw new Error(`Expected 404 after deletion, got ${verifyDelete.status}`);
    console.log('   ✓ Confirmed assignment no longer exists (status 404)');

    console.log('\n🎉 ALL PHASE 5 ASSIGNMENT TESTS PASSED WITH 100% SUCCESS AGAINST REAL POSTGRESQL!');
  } finally {
    if (server) await new Promise(r => server.close(r));
    await db.closePool();
    clearTimeout(timeoutHandle);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Assignment Test Suite Failed:', err);
  if (server) server.close();
  clearTimeout(timeoutHandle);
  process.exit(1);
});