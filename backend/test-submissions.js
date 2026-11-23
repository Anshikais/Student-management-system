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
const PORT = 5008;

async function runTests() {
  await db.initDb();

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  console.log(`Test server active on port ${PORT}...`);

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

    // Student Leader Sarah (Group 1 - Alpha Innovators)
    const sarahLogin = await request('POST', '/auth/login', {
      email: 'leader@joineazy.edu',
      password: 'Student@123'
    });
    const sarahToken = sarahLogin.body.data.token;
    const sarahId = sarahLogin.body.data.user.id;
    const group1Id = sarahLogin.body.data.user.group.id;

    // Student Member John (Group 1 - Alpha Innovators, NOT leader)
    const johnLogin = await request('POST', '/auth/login', {
      email: 'john@joineazy.edu',
      password: 'Student@123'
    });
    const johnToken = johnLogin.body.data.token;

    // Student Leader Bob (Group 2 - Beta Developers)
    const bobLogin = await request('POST', '/auth/login', {
      email: 'bob@joineazy.edu',
      password: 'Student@123'
    });
    const bobToken = bobLogin.body.data.token;

    // Create a new fresh assignment allocated to all students for test isolation
    const assignRes = await request('POST', '/assignments', {
      title: 'Phase 6 Integration Assignment',
      description: 'Testing submission confirmation and progress tracking mechanics.',
      due_date: new Date(Date.now() + 10 * 86400000).toISOString(),
      onedrive_link: 'https://1drv.ms/u/s!AmxYzPhase6TestFolder',
      allocation_type: 'all'
    }, adminToken);
    const testAssignId = assignRes.body.data.assignment.id;
    console.log(`   ✓ Prepared test assignment ID ${testAssignId}`);

    console.log('\n1. Test Non-Leader Confirmation Rejection');
    const nonLeaderRes = await request('POST', '/submissions/confirm', {
      assignment_id: testAssignId
    }, johnToken);
    if (nonLeaderRes.status !== 403) throw new Error(`Expected 403 for non-leader submission, got ${nonLeaderRes.status}`);
    console.log('   ✓ Non-leader member confirmation rejected with 403 Forbidden');

    console.log('\n2. Test Unauthorized Group ID Confirmation Rejection');
    const wrongGroupRes = await request('POST', '/submissions/confirm', {
      assignment_id: testAssignId,
      group_id: 2 // Sarah belongs to Group 1, trying to submit for Group 2
    }, sarahToken);
    if (wrongGroupRes.status !== 403) throw new Error(`Expected 403 for cross-group spoof, got ${wrongGroupRes.status}`);
    console.log('   ✓ Cross-group confirmation spoof rejected with 403 Forbidden');

    console.log('\n3. Test Successful First Submission by Leader');
    const submitRes = await request('POST', '/submissions/confirm', {
      assignment_id: testAssignId,
      group_id: group1Id
    }, sarahToken);
    if (submitRes.status !== 201) throw new Error(`Submission failed: ${JSON.stringify(submitRes.body)}`);
    console.log('   ✓ Group leader Sarah successfully confirmed submission (status 201)');
    const sub = submitRes.body.data.submission;
    if (sub.confirmed_by !== sarahId || !sub.confirmed_at) {
      throw new Error('Missing confirmed_by or confirmed_at in response');
    }
    console.log(`   ✓ Stored confirming student ID (${sub.confirmed_by}) and timestamp (${sub.confirmed_at})`);

    console.log('\n4. Test Duplicate Submission Prevention');
    const dupRes = await request('POST', '/submissions/confirm', {
      assignment_id: testAssignId,
      group_id: group1Id
    }, sarahToken);
    if (dupRes.status !== 409) throw new Error(`Expected 409 Conflict for duplicate submission, got ${dupRes.status}`);
    console.log('   ✓ Duplicate submission rejected with 409 Conflict');

    console.log('\n5. Test Student Progress Calculation');
    const studentProgressRes = await request('GET', '/submissions/progress', null, sarahToken);
    if (studentProgressRes.status !== 200) throw new Error(`Student progress failed: ${JSON.stringify(studentProgressRes.body)}`);
    const sProgress = studentProgressRes.body.data;
    console.log('   Student Progress Data:', sProgress);
    if (typeof sProgress.progress_percentage !== 'number' || sProgress.completed_assignments < 1) {
      throw new Error('Invalid student progress metrics');
    }
    const expectedPct = Math.round((sProgress.completed_assignments / sProgress.total_assignments) * 100);
    if (sProgress.progress_percentage !== expectedPct) {
      throw new Error(`Math error: expected ${expectedPct}%, got ${sProgress.progress_percentage}%`);
    }
    console.log(`   ✓ Correct progress percentage calculated: ${sProgress.progress_percentage}%`);

    console.log('\n6. Test Student Access Restrictions');
    const studentSubmissionsRes = await request('GET', '/submissions', null, sarahToken);
    if (studentSubmissionsRes.status !== 200) throw new Error('Student submissions failed');
    const studentSubs = studentSubmissionsRes.body.data.submissions;
    const hasOtherGroup = studentSubs.some(s => s.group_id !== group1Id);
    if (hasOtherGroup) throw new Error('Student saw submissions belonging to other groups!');
    console.log(`   ✓ Student sees only their own group's submissions (${studentSubs.length} records)`);

    console.log('\n7. Test Admin Monitoring & System-wide Progress');
    const adminProgressRes = await request('GET', '/submissions/progress', null, adminToken);
    if (adminProgressRes.status !== 200) throw new Error('Admin progress failed');
    const aProgress = adminProgressRes.body.data;
    console.log('   Admin System Progress:', {
      total_assignments: aProgress.total_assignments,
      total_groups: aProgress.total_groups,
      completed_groups: aProgress.completed_groups,
      pending_groups: aProgress.pending_groups,
      overall_percentage: aProgress.overall_progress_percentage
    });
    if (!Array.isArray(aProgress.groups) || aProgress.groups.length === 0) {
      throw new Error('Admin progress missing group breakdowns');
    }
    console.log(`   ✓ Admin retrieved monitoring summary and ${aProgress.groups.length} group breakdowns`);

    console.log('\n8. Test Admin Assignment Submission Tracking');
    const assignTrackRes = await request('GET', `/submissions/assignment/${testAssignId}`, null, adminToken);
    if (assignTrackRes.status !== 200) throw new Error('Assignment tracking failed');
    const trackData = assignTrackRes.body.data;
    console.log(`   Assignment Tracking for "${trackData.assignment_title}":`, {
      total_eligible: trackData.total_eligible_groups,
      submitted: trackData.submitted_groups,
      pending: trackData.pending_groups,
      completion_percentage: trackData.completion_percentage
    });
    const g1Status = trackData.groups.find(g => g.group_id === group1Id);
    if (!g1Status || !g1Status.is_submitted) {
      throw new Error('Group 1 should be marked as submitted in tracking');
    }
    console.log(`   ✓ Tracking shows Group 1 submitted by "${g1Status.confirmed_by_name}" at ${g1Status.confirmed_at}`);

    console.log('\n🎉 ALL PHASE 6 SUBMISSION TESTS PASSED WITH 100% SUCCESS AGAINST REAL POSTGRESQL!');
  } finally {
    if (server) await new Promise(r => server.close(r));
    await db.closePool();
    clearTimeout(timeoutHandle);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Submission Test Suite Failed:', err);
  if (server) server.close();
  clearTimeout(timeoutHandle);
  process.exit(1);
});