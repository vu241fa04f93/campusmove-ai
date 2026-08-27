import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runPhase6Verification = async () => {
  console.log('================================================================');
  console.log('  CAMPUSMOVE AI — PHASE 6 COMPLAINTS & INCIDENTS TEST SUITE     ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (condition, name, details = '') => {
    total++;
    if (condition) {
      passed++;
      console.log(` ✅ PASS: ${name} ${details ? `[${details}]` : ''}`);
    } else {
      console.error(` ❌ FAIL: ${name} ${details ? `[${details}]` : ''}`);
      throw new Error(`Test failed: ${name}`);
    }
  };

  try {
    // 1. Authenticate Student, Second Student, Driver, Admin
    console.log('--- [1/6] Authenticating Users for RBAC Verification ---');
    const student1Login = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@campusmove.edu', password: 'student123' }),
      })
    ).json();
    assert(student1Login.success === true && student1Login.token, 'Student 1 logged in successfully');
    const student1Token = student1Login.token;

    // Register Student 2 for cross-student unauthorized access check
    const randId = Math.floor(1000 + Math.random() * 9000);
    const student2Register = await (
      await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Student Two ${randId}`,
          email: `student2_${randId}@campusmove.edu`,
          password: 'password123',
          role: 'student',
          hostel: 'Hostel 7',
          department: 'Mathematics',
        }),
      })
    ).json();
    assert(student2Register.success === true && student2Register.token, 'Student 2 registered for access testing');
    const student2Token = student2Register.token;

    const driverLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'driver@campusmove.edu', password: 'driver123' }),
      })
    ).json();
    assert(driverLogin.success === true && driverLogin.token, 'Driver logged in successfully');
    const driverToken = driverLogin.token;

    const adminLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@campusmove.edu', password: 'admin123' }),
      })
    ).json();
    assert(adminLogin.success === true && adminLogin.token, 'Admin logged in successfully');
    const adminToken = adminLogin.token;

    // 2. Student Complaint Submission & Ticket ID Generation
    console.log('\n--- [2/6] Testing Student Complaint Submission & Ticket Generation ---');
    const busesRes = await (await fetch(`${BASE_URL}/buses`)).json();
    const stopsRes = await (await fetch(`${BASE_URL}/stops`)).json();
    const bus12 = busesRes.data.find((b) => b.busNumber === 'Bus 12');
    const h3Stop = stopsRes.data.find((s) => s.code === 'H3');

    const submitRes = await (
      await fetch(`${BASE_URL}/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${student1Token}`,
        },
        body: JSON.stringify({
          title: 'Bus 12 arrived 25 minutes late at Hostel 3',
          description: 'Students were left waiting at Hostel 3 stop in heavy rain without shelter alerts.',
          category: 'bus_delay',
          priority: 'high',
          bus: bus12?._id,
          stop: h3Stop?._id,
        }),
      })
    ).json();

    assert(submitRes.success === true, 'Student submitted complaint successfully');
    assert(submitRes.data && submitRes.data.ticketId, 'Auto-generated ticket ID created', submitRes.data.ticketId);
    assert(submitRes.data.status === 'open', 'Initial status set to open');
    assert(Array.isArray(submitRes.data.history) && submitRes.data.history.length > 0, 'Audit history timeline initialized');
    const complaintId = submitRes.data._id;
    const ticketId = submitRes.data.ticketId;

    // 3. Student Retrieval & Cross-Student RBAC Isolation
    console.log('\n--- [3/6] Testing Student Retrieval & RBAC Isolation ---');
    const myComplaintsRes = await (
      await fetch(`${BASE_URL}/complaints/my`, {
        headers: { Authorization: `Bearer ${student1Token}` },
      })
    ).json();

    assert(myComplaintsRes.success === true, 'Student 1 retrieved own complaints list');
    assert(
      myComplaintsRes.data.some((c) => c._id === complaintId),
      'Created complaint present in student 1 list'
    );

    // Student 2 attempts to fetch Student 1's complaint directly -> Expect 403 Forbidden
    const crossAccessRes = await fetch(`${BASE_URL}/complaints/${complaintId}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    assert(crossAccessRes.status === 403, 'RBAC Isolation: Student 2 blocked from reading Student 1 complaint (403 Forbidden)');

    // 4. Admin Management, In-Progress, and Resolution
    console.log('\n--- [4/6] Testing Admin Complaint Lifecycle & Resolution ---');
    const adminGetAllRes = await (
      await fetch(`${BASE_URL}/complaints?status=open&category=bus_delay`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(adminGetAllRes.success === true, 'Admin retrieved complaints with filters');
    assert(
      adminGetAllRes.data.some((c) => c._id === complaintId),
      'Complaint found in filtered admin queue'
    );

    // Admin moves complaint to in_progress
    const progressRes = await (
      await fetch(`${BASE_URL}/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'in_progress',
          message: 'Assigned to Depot Dispatch Manager for schedule review',
        }),
      })
    ).json();

    assert(progressRes.success === true && progressRes.data.status === 'in_progress', 'Admin moved complaint to in_progress');

    // Admin resolves complaint
    const resolveRes = await (
      await fetch(`${BASE_URL}/complaints/${complaintId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          resolutionNotes: 'Driver schedule adjusted and backup shuttle R-101 assigned during peak hours.',
        }),
      })
    ).json();

    assert(resolveRes.success === true, 'Admin resolved complaint successfully');
    assert(resolveRes.data.status === 'resolved', 'Status transitioned to resolved');
    assert(resolveRes.data.resolutionNotes.includes('Driver schedule adjusted'), 'Resolution notes recorded in database');
    assert(resolveRes.data.resolvedBy, 'ResolvedBy admin reference populated');

    // 5. Student Confirmation & Reopen Lifecycle
    console.log('\n--- [5/6] Testing Student Resolution Confirmation & Reopen ---');
    // Student reopens ticket with reason
    const reopenRes = await (
      await fetch(`${BASE_URL}/complaints/${complaintId}/reopen`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${student1Token}`,
        },
        body: JSON.stringify({
          reopenReason: 'Bus was still 15 mins late the following morning at Hostel 3.',
        }),
      })
    ).json();

    assert(reopenRes.success === true, 'Student reopened complaint');
    assert(reopenRes.data.status === 'open', 'Reopened complaint returned to open status');
    assert(reopenRes.data.reopenReason.includes('still 15 mins late'), 'Reopen reason persisted in record');

    // Admin re-resolves
    await (
      await fetch(`${BASE_URL}/complaints/${complaintId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          resolutionNotes: 'Additional monitoring applied and second driver dispatched on time.',
        }),
      })
    ).json();

    // Student confirms resolution
    const confirmRes = await (
      await fetch(`${BASE_URL}/complaints/${complaintId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${student1Token}`,
        },
        body: JSON.stringify({
          feedback: 'Verified on-time arrival at 08:30 today. Thank you!',
        }),
      })
    ).json();

    assert(confirmRes.success === true, 'Student confirmed complaint resolution');
    assert(confirmRes.data.status === 'confirmed', 'Status finalized to confirmed');
    assert(confirmRes.data.history.length >= 5, 'Comprehensive audit history events captured', `Events: ${confirmRes.data.history.length}`);

    // 6. Incident Reporting, Resolution, and Closure
    console.log('\n--- [6/6] Testing Driver Incident Reporting & Admin Closure ---');
    const incidentReportRes = await (
      await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${driverToken}`,
        },
        body: JSON.stringify({
          title: 'Minor mechanical issue near Sports Arena',
          description: 'Coolant warning light illuminated. Bus safely pulled over for inspection.',
          type: 'breakdown',
          severity: 'medium',
          bus: bus12?._id,
        }),
      })
    ).json();

    assert(incidentReportRes.success === true, 'Driver reported incident successfully');
    assert(incidentReportRes.data.incidentNumber, 'Incident number auto-generated', incidentReportRes.data.incidentNumber);
    assert(incidentReportRes.data.status === 'reported', 'Initial incident status is reported');
    const incidentId = incidentReportRes.data._id;

    // Admin retrieves incidents
    const adminIncidentsRes = await (
      await fetch(`${BASE_URL}/incidents?status=reported`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(adminIncidentsRes.success === true, 'Admin retrieved active incidents list');
    assert(
      adminIncidentsRes.data.some((i) => i._id === incidentId),
      'Reported incident present in admin dispatch list'
    );

    // Admin sets incident to investigating
    const updateIncRes = await (
      await fetch(`${BASE_URL}/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'investigating',
        }),
      })
    ).json();

    assert(updateIncRes.success === true && updateIncRes.data.status === 'investigating', 'Admin updated incident status to investigating');

    // Admin resolves incident
    const resolveIncRes = await (
      await fetch(`${BASE_URL}/incidents/${incidentId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          resolutionNotes: 'Coolant topped off by maintenance team. Vehicle cleared for campus line.',
        }),
      })
    ).json();

    assert(resolveIncRes.success === true && resolveIncRes.data.status === 'resolved', 'Admin resolved incident with repair notes');

    // Admin closes incident
    const closeIncRes = await (
      await fetch(`${BASE_URL}/incidents/${incidentId}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(closeIncRes.success === true && closeIncRes.data.status === 'closed', 'Admin closed and archived incident');

    console.log('\n================================================================');
    console.log(` 🎉 ALL PHASE 6 COMPLAINTS & INCIDENTS TESTS PASSED! (${passed}/${total})`);
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ Phase 6 Verification Failed:', error.message);
    process.exit(1);
  }
};

runPhase6Verification();
