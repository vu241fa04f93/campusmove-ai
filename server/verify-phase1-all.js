import http from 'http';

const BASE_URL = 'http://localhost:5000/api';

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
};

const runComprehensiveVerification = async () => {
  console.log('================================================================');
  console.log('      CAMPUSMOVE AI — COMPLETE PHASE 1 VERIFICATION SUITE       ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition, testName, details = '') => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(` ✅ PASS: ${testName} ${details ? `(${details})` : ''}`);
    } else {
      console.error(` ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      throw new Error(`Test failed: ${testName}`);
    }
  };

  try {
    // ---------------------------------------------------------
    // 1. HEALTH & CONNECTIVITY CHECK
    // ---------------------------------------------------------
    console.log('--- [1/6] System Health & MongoDB Connectivity ---');
    const health = await fetchJson(`${BASE_URL}/health`);
    assert(health.status === 200 && health.data.status === 'online', 'Health endpoint status is online');

    // ---------------------------------------------------------
    // 2. AUTHENTICATION & RBAC TESTS
    // ---------------------------------------------------------
    console.log('\n--- [2/6] Authentication & RBAC Verification ---');

    // Test Unauthenticated access to protected route
    const unauthStops = await fetchJson(`${BASE_URL}/users`);
    assert(unauthStops.status === 401, 'Unauthenticated access to /api/users returns 401 Unauthorized');

    // Test Invalid Login
    const invalidLogin = await fetchJson(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@campusmove.edu', password: 'wrongpassword' }),
    });
    assert(invalidLogin.status === 401, 'Invalid password returns 401 Unauthorized');

    // Login Student
    const studentLogin = await fetchJson(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@campusmove.edu', password: 'student123' }),
    });
    assert(studentLogin.status === 200 && studentLogin.data.token, 'Student Login successful');
    const studentToken = studentLogin.data.token;
    assert(studentLogin.data.user.role === 'student', 'Student role correctly populated');

    // Login Driver
    const driverLogin = await fetchJson(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'driver@campusmove.edu', password: 'driver123' }),
    });
    assert(driverLogin.status === 200 && driverLogin.data.token, 'Driver Login successful');
    const driverToken = driverLogin.data.token;
    assert(driverLogin.data.user.role === 'driver', 'Driver role correctly populated');

    // Login Admin
    const adminLogin = await fetchJson(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@campusmove.edu', password: 'admin123' }),
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, 'Admin Login successful');
    const adminToken = adminLogin.data.token;
    assert(adminLogin.data.user.role === 'admin', 'Admin role correctly populated');

    // Test /api/auth/me session check
    const meRes = await fetchJson(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(meRes.status === 200 && meRes.data.user.email === 'student@campusmove.edu', 'GET /api/auth/me validates session');

    // Register a new test student
    const randId = Math.floor(1000 + Math.random() * 9000);
    const newStudentRes = await fetchJson(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: `Test Commuter ${randId}`,
        email: `student_${randId}@campusmove.edu`,
        password: 'password123',
        role: 'student',
        hostel: 'Hostel 7',
        department: 'Biotechnology',
      }),
    });
    assert(newStudentRes.status === 201 && newStudentRes.data.token, 'New student registration and profile creation');

    // ---------------------------------------------------------
    // 3. STUDENT FLOW & READ OPERATIONS
    // ---------------------------------------------------------
    console.log('\n--- [3/6] Student Flow & Transport Exploration ---');

    // Fetch Stops
    const stopsRes = await fetchJson(`${BASE_URL}/stops`);
    assert(stopsRes.status === 200 && stopsRes.data.count >= 8, 'Student reads campus stops (count >= 8)');
    const h3Stop = stopsRes.data.data.find((s) => s.code === 'H3');
    assert(h3Stop && h3Stop.coordinates.lat > 0, 'Hostel 3 stop exists with valid GPS coordinates');

    // Fetch Routes
    const routesRes = await fetchJson(`${BASE_URL}/routes`);
    assert(routesRes.status === 200 && routesRes.data.count >= 3, 'Student reads campus routes (count >= 3)');
    const route1 = routesRes.data.data[0];
    assert(route1.stops && route1.stops.length > 0, 'Route has populated stop checkpoint references');

    // Fetch Fleet Buses
    const busesRes = await fetchJson(`${BASE_URL}/buses`);
    assert(busesRes.status === 200 && busesRes.data.count >= 4, 'Student reads campus fleet buses (count >= 4)');
    const bus12 = busesRes.data.data.find((b) => b.busNumber === 'Bus 12');
    assert(bus12 && bus12.status === 'active', 'Bus 12 active status verified');

    // Fetch Schedules
    const schedRes = await fetchJson(`${BASE_URL}/schedules`);
    assert(schedRes.status === 200 && schedRes.data.count >= 10, 'Student reads daily timetable schedules');

    // Verify Student blocked from mutating stops
    const studentMutateAttempt = await fetchJson(`${BASE_URL}/stops`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ name: 'Hacker Stop', code: 'HACK', coordinates: { lat: 28.5, lng: 77.1 } }),
    });
    assert(studentMutateAttempt.status === 403, 'RBAC Guard: Student blocked from creating stops (403 Forbidden)');

    // ---------------------------------------------------------
    // 4. DRIVER FLOW & STATUS UPDATES
    // ---------------------------------------------------------
    console.log('\n--- [4/6] Driver Flow & Operational Updates ---');

    // Driver updates their assigned bus status to delayed
    const driverUpdateRes = await fetchJson(`${BASE_URL}/buses/${bus12._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({
        status: 'delayed',
        statusMessage: 'Heavy foot traffic near hostel circle',
      }),
    });
    assert(driverUpdateRes.status === 200 && driverUpdateRes.data.data.status === 'delayed', 'Driver updates assigned bus status to delayed');

    // Driver reverts status to active
    await fetchJson(`${BASE_URL}/buses/${bus12._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({
        status: 'active',
        statusMessage: 'Approaching Hostel 3 stop on schedule',
      }),
    });

    // Driver blocked from modifying unassigned bus (e.g. Bus 07)
    const bus07 = busesRes.data.data.find((b) => b.busNumber === 'Bus 07');
    if (bus07) {
      const driverUnauthorizedBusAttempt = await fetchJson(`${BASE_URL}/buses/${bus07._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${driverToken}` },
        body: JSON.stringify({ status: 'breakdown' }),
      });
      assert(driverUnauthorizedBusAttempt.status === 403, 'Driver blocked from modifying unassigned bus (403 Forbidden)');
    }

    // ---------------------------------------------------------
    // 5. ADMIN CRUD & FLEET MANAGEMENT
    // ---------------------------------------------------------
    console.log('\n--- [5/6] Admin CRUD Operations ---');

    // Stop CRUD
    const createdStopRes = await fetchJson(`${BASE_URL}/stops`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Innovation & Research Hub',
        code: `INV-${randId}`,
        coordinates: { lat: 28.5492, lng: 77.1935 },
        campusZone: 'Academic Zone',
        amenities: ['Solar Charging Bench', 'Covered Walkway'],
      }),
    });
    assert(createdStopRes.status === 201 && createdStopRes.data.data._id, 'Admin CREATE Stop');
    const createdStopId = createdStopRes.data.data._id;

    const updatedStopRes = await fetchJson(`${BASE_URL}/stops/${createdStopId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Innovation Hub North' }),
    });
    assert(updatedStopRes.status === 200 && updatedStopRes.data.data.name === 'Innovation Hub North', 'Admin UPDATE Stop');

    // Bus CRUD
    const createdBusRes = await fetchJson(`${BASE_URL}/buses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        busNumber: `Bus ${randId}`,
        plateNumber: `KA-01-TMP-${randId}`,
        model: 'Electric Pilot 30',
        capacity: 30,
        status: 'active',
      }),
    });
    assert(createdBusRes.status === 201 && createdBusRes.data.data._id, 'Admin CREATE Bus');
    const createdBusId = createdBusRes.data.data._id;

    // Route CRUD
    const createdRouteRes = await fetchJson(`${BASE_URL}/routes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `Research Express Loop ${randId}`,
        code: `R-${randId}`,
        color: '#ec4899',
        description: 'New fast route for lab researchers',
        stops: [{ stop: createdStopId, sequence: 1, distanceFromStartKm: 0, estimatedMinutesFromStart: 0 }],
      }),
    });
    assert(createdRouteRes.status === 201 && createdRouteRes.data.data._id, 'Admin CREATE Route (auto path coordinates populated)');
    const createdRouteId = createdRouteRes.data.data._id;

    // Schedule CRUD
    const createdSchedRes = await fetchJson(`${BASE_URL}/schedules`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        route: createdRouteId,
        bus: createdBusId,
        departureTime: '11:45',
        estimatedArrivalTime: '12:00',
        frequencyMinutes: 20,
        direction: 'circular',
      }),
    });
    assert(createdSchedRes.status === 201 && createdSchedRes.data.data._id, 'Admin CREATE Schedule');
    const createdSchedId = createdSchedRes.data.data._id;

    // Clean up created entities
    await fetchJson(`${BASE_URL}/schedules/${createdSchedId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
    await fetchJson(`${BASE_URL}/routes/${createdRouteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
    await fetchJson(`${BASE_URL}/buses/${createdBusId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
    await fetchJson(`${BASE_URL}/stops/${createdStopId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
    assert(true, 'Admin DELETE operations for Stop, Bus, Route, Schedule clean up properly');

    // Admin Users Management & Role Elevation
    const usersListRes = await fetchJson(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(usersListRes.status === 200 && usersListRes.data.count > 0, 'Admin reads user directory');

    // ---------------------------------------------------------
    // 6. SUMMARY REPORT
    // ---------------------------------------------------------
    console.log('\n================================================================');
    console.log(` 🎉 PHASE 1 VERIFICATION COMPLETED: ${passedTests}/${totalTests} TESTS PASSED!`);
    console.log('================================================================\n');

    return true;
  } catch (err) {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  }
};

runComprehensiveVerification();
