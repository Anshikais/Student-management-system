process.env.NODE_ENV = 'test';

import app from './server.js';
import db from './config/db.js';
import http from 'http';

const timeoutHandle = setTimeout(() => {
  console.error('❌ E2E test suite timed out after 15 seconds!');
  process.exit(1);
}, 15000);
timeoutHandle.unref();

let server;
const PORT = 5009;

async function runE2ETests() {
  await db.initDb();

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  console.log(`E2E Test Server running on port ${PORT}...`);

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
    const timestamp = Date.now();
    const student1Email = `e2e_leader_${timestamp}@joineazy.edu`;
    const student1Id = `STU-E2E1-${timestamp.toString().slice(-4)}`;
    const student2Email = `e2e_peer_${timestamp}@joineazy.edu`;
    const student2Id = `STU-E2E2-${timestamp.toString().slice(-4)}`;

    console.log('=== STUDENT E2E WORKFLOW ===');

    // 1. Register new student
    console.log('1. Student Registration...');
    const regRes = await request('POST', '/auth/register', {
      name: 'E2E Test Leader',
      email: student1Email,
      student_id: student1Id,
      password: 'Student@123'
    });
    if (regRes.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
    const student1Token = regRes.body.data.token;
    console.log(`   ✓ Student registered: ${student1Email} (ID: ${student1Id})`);

    // 2. Student Login
    console.log('2. Student Login...');
    const loginRes = await request('POST', '/auth/login', {
      email: student1Email,
      password: 'Student@123'
    });
    if (loginRes.status !== 200) throw new Error('Student login failed');
    console.log('   ✓ Student logged in successfully');

    // 3. Create Group
    console.log('3. Create Group & Auto-Assign Leader...');
    const groupRes = await request('POST', '/groups', {
      name: `Delta Innovators ${timestamp.toString().slice(-4)}`
    }, student1Token);
    if (groupRes.status !== 201) throw new Error(`Create group failed: ${JSON.stringify(groupRes.body)}`);
    const newGroup = groupRes.body.data.group;
    console.log(`   ✓ Group created: "${newGroup.name}" (Code: ${newGroup.group_code})`);

    // 4. Register second student
    console.log('4. Register Peer Student...');
    const reg2Res = await request('POST', '/auth/register', {
      name: 'E2E Peer Member',
      email: student2Email,
      student_id: student2Id,
      password: 'Student@123'
    });
    if (reg2Res.status !== 201) throw new Error('Peer registration failed');
    console.log(`   ✓ Peer student registered: ${student2Email} (ID: ${student2Id})`);

    // 5. Add peer member by Student ID
    console.log('5. Group Leader Adds Peer Member by Student ID...');
    const addRes = await request('POST', `/groups/${newGroup.id}/members`, {
      identifier: student2Id
    }, student1Token);
    if (addRes.status !== 201) throw new Error(`Add member failed: ${JSON.stringify(addRes.body)}`);
    console.log(`   ✓ Member added to group: ${addRes.body.data.member.name}`);

    // 6. View Assignments for this group
    console.log('6. View Allocated Assignments...');
    const listRes = await request('GET', '/assignments', null, student1Token);
    if (listRes.status !== 200) throw new Error('View assignments failed');
    const assignedList = listRes.body.data.assignments;
    console.log(`   ✓ Student retrieved ${assignedList.length} assignments allocated to their team`);

    // Pick an unsubmitted assignment
    const targetAssign = assignedList.find(a => !a.is_submitted) || assignedList[0];

    // 7. Confirm Submission
    console.log(`7. Confirm Submission for "${targetAssign.title}"...`);
    const submitRes = await request('POST', '/submissions/confirm', {
      assignment_id: targetAssign.id,
      group_id: newGroup.id
    }, student1Token);
    if (submitRes.status !== 201) throw new Error(`Submission failed: ${JSON.stringify(submitRes.body)}`);
    console.log('   ✓ Submission successfully confirmed by leader');

    // 8. View Updated Progress
    console.log('8. View Updated Progress Metrics...');
    const progressRes = await request('GET', '/submissions/progress', null, student1Token);
    if (progressRes.status !== 200) throw new Error('Progress failed');
    const progress = progressRes.data?.data || progressRes.body.data;
    console.log(`   ✓ Progress updated: ${progress.completed_assignments} of ${progress.total_assignments} completed (${progress.progress_percentage}%)`);

    console.log('\n=== ADMIN E2E WORKFLOW ===');

    // 1. Admin Login
    console.log('1. Admin Login...');
    const adminLogin = await request('POST', '/auth/login', {
      email: 'admin@joineazy.edu',
      password: 'Admin@123'
    });
    if (adminLogin.status !== 200) throw new Error('Admin login failed');
    const adminToken = adminLogin.body.data.token;
    console.log('   ✓ Admin authenticated (Role: admin)');

    // 2. Admin Creates Assignment for new group
    console.log('2. Admin Creates Group-Specific Assignment...');
    const createAssignRes = await request('POST', '/assignments', {
      title: `E2E Custom Assignment ${timestamp.toString().slice(-4)}`,
      description: 'Special assignment allocated directly to the newly formed Delta team.',
      due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
      onedrive_link: 'https://1drv.ms/u/s!AmxYzE2ECustomFolder',
      allocation_type: 'groups',
      group_ids: [newGroup.id]
    }, adminToken);
    if (createAssignRes.status !== 201) throw new Error('Admin create assignment failed');
    const createdAssign = createAssignRes.body.data.assignment;
    console.log(`   ✓ Created assignment ID ${createdAssign.id} assigned specifically to Group ${newGroup.id}`);

    // 3. Admin Dashboard API
    console.log('3. GET /api/admin/dashboard...');
    const adminDash = await request('GET', '/admin/dashboard', null, adminToken);
    if (adminDash.status !== 200) throw new Error('Admin dashboard failed');
    console.log('   ✓ Admin Dashboard data:', {
      total_students: adminDash.body.data.total_students,
      total_groups: adminDash.body.data.total_groups,
      total_assignments: adminDash.body.data.total_assignments,
      overall_percentage: adminDash.body.data.overall_progress_percentage
    });

    // 4. Admin Groups API
    console.log('4. GET /api/admin/groups...');
    const adminGroups = await request('GET', '/admin/groups', null, adminToken);
    if (adminGroups.status !== 200) throw new Error('Admin groups failed');
    console.log(`   ✓ Admin retrieved ${adminGroups.body.data.groups.length} groups with member details`);

    // 5. Admin Analytics API
    console.log('5. GET /api/admin/analytics...');
    const adminAnalytics = await request('GET', '/admin/analytics', null, adminToken);
    if (adminAnalytics.status !== 200) throw new Error('Admin analytics failed');
    console.log('   ✓ Admin Analytics retrieved:', {
      overview: adminAnalytics.body.data.overview,
      group_count: adminAnalytics.body.data.groups.length
    });

    // 6. Admin Submission Tracking for the new assignment
    console.log('6. GET /api/submissions/assignment/:id...');
    const trackRes = await request('GET', `/submissions/assignment/${createdAssign.id}`, null, adminToken);
    if (trackRes.status !== 200) throw new Error('Tracking failed');
    console.log(`   ✓ Tracking verified: ${trackRes.body.data.total_eligible_groups} eligible groups, ${trackRes.body.data.pending_groups} pending`);

    console.log('\n🎉 ALL COMPLETE END-TO-END WORKFLOWS PASSED WITH 100% SUCCESS!');
  } finally {
    if (server) await new Promise(r => server.close(r));
    await db.closePool();
    clearTimeout(timeoutHandle);
    process.exit(0);
  }
}

runE2ETests().catch(err => {
  console.error('❌ E2E Test Suite Failed:', err);
  if (server) server.close();
  clearTimeout(timeoutHandle);
  process.exit(1);
});