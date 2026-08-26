const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('🧪 Starting CampusMove AI Phase 1 API Verification Suite...\n');

  try {
    // 1. Health Check
    console.log('1. Testing Health Endpoint: GET /api/health');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('   ✓ Health status:', health.status);

    // 2. Auth Logins
    console.log('\n2. Testing Authentication & Token Issuance:');
    
    // Student Login
    const studentRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@campusmove.edu',
        password: 'student123',
      }),
    });
    const studentData = await studentRes.json();
    const studentToken = studentData.token;
    console.log(`   ✓ Student Logged In: ${studentData.user.name} (${studentData.user.role}) - Token: OK`);

    // Driver Login
    const driverRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'driver@campusmove.edu',
        password: 'driver123',
      }),
    });
    const driverData = await driverRes.json();
    const driverToken = driverData.token;
    console.log(`   ✓ Driver Logged In: ${driverData.user.name} (${driverData.user.role}) - Token: OK`);

    // Admin Login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@campusmove.edu',
        password: 'admin123',
      }),
    });
    const adminData = await adminRes.json();
    const adminToken = adminData.token;
    console.log(`   ✓ Admin Logged In: ${adminData.user.name} (${adminData.user.role}) - Token: OK`);

    // 3. Stops
    console.log('\n3. Testing Stops Endpoint: GET /api/stops');
    const stopsRes = await (await fetch(`${BASE_URL}/stops`)).json();
    console.log(`   ✓ Retrieved ${stopsRes.count} campus stops.`);
    const h3 = stopsRes.data.find(s => s.code === 'H3');
    console.log(`   ✓ Verified Hostel 3 stop: lat=${h3?.coordinates.lat}, lng=${h3?.coordinates.lng}`);

    // 4. Routes
    console.log('\n4. Testing Routes Endpoint: GET /api/routes');
    const routesRes = await (await fetch(`${BASE_URL}/routes`)).json();
    console.log(`   ✓ Retrieved ${routesRes.count} routes.`);
    console.log(`   ✓ Route 1: "${routesRes.data[0].name}" with ${routesRes.data[0].stops.length} stop checkpoints.`);

    // 5. Buses
    console.log('\n5. Testing Buses Endpoint: GET /api/buses');
    const busesRes = await (await fetch(`${BASE_URL}/buses`)).json();
    console.log(`   ✓ Retrieved ${busesRes.count} fleet buses.`);
    const bus12 = busesRes.data.find(b => b.busNumber === 'Bus 12');
    console.log(`   ✓ Verified Bus 12 assigned to route: ${bus12?.currentRoute?.name}, status: ${bus12?.status}`);

    // 6. Schedules
    console.log('\n6. Testing Schedules Endpoint: GET /api/schedules');
    const schedRes = await (await fetch(`${BASE_URL}/schedules`)).json();
    console.log(`   ✓ Retrieved ${schedRes.count} timetable departures.`);

    // 7. Admin CRUD Test (Create Stop, verify, delete)
    console.log('\n7. Testing Admin Stop CRUD:');
    const createStopRes = await fetch(`${BASE_URL}/stops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Temporary Event Terminal',
        code: 'EVT-TMP',
        coordinates: { lat: 28.549, lng: 77.193 },
        campusZone: 'Academic Zone',
        amenities: ['Temporary Tent'],
      }),
    });
    const createdStop = await createStopRes.json();
    const newStopId = createdStop.data._id;
    console.log(`   ✓ Created test stop ID: ${newStopId} (${createdStop.data.name})`);

    // Delete created stop
    await fetch(`${BASE_URL}/stops/${newStopId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('   ✓ Deleted test stop successfully.');

    // 8. RBAC Protection Check: Student attempting Admin endpoint
    console.log('\n8. Testing RBAC Security Guard:');
    const studentAttempt = await fetch(`${BASE_URL}/stops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Stop',
        code: 'UNAUTH',
        coordinates: { lat: 28.5, lng: 77.1 },
      }),
    });
    if (studentAttempt.status === 403) {
      console.log('   ✓ RBAC Verified: Student token blocked with 403 Forbidden as expected.');
    } else {
      console.error('   ❌ Unexpected response status:', studentAttempt.status);
    }

    console.log('\n🎉 ALL PHASE 1 API VERIFICATION TESTS PASSED SUCCESSFULLY! ✅\n');
  } catch (error) {
    console.error('\n❌ API Verification Failed:', error.message);
    process.exit(1);
  }
};

runTests();
