import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const runE2EPhase2Test = async () => {
  console.log('================================================================');
  console.log('    CAMPUSMOVE AI — PHASE 2 MULTI-ROLE REALTIME E2E SUITE     ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (condition, name, extra = '') => {
    total++;
    if (condition) {
      passed++;
      console.log(` ✅ PASS: ${name} ${extra ? `[${extra}]` : ''}`);
    } else {
      console.error(` ❌ FAIL: ${name} ${extra ? `[${extra}]` : ''}`);
      throw new Error(`Assertion failed: ${name}`);
    }
  };

  try {
    // 1. Fetch Fleet to get Bus 12
    console.log('--- Step 1: Query API for Fleet Setup ---');
    const busesRes = await (await fetch(`${BASE_URL}/buses`)).json();
    const bus12 = busesRes.data.find((b) => b.busNumber === 'Bus 12');
    assert(bus12 && bus12._id, 'Retrieved Bus 12', `ID: ${bus12._id}`);
    const busId = bus12._id;
    const routeId = bus12.currentRoute?._id;
    const driverId = bus12.currentDriver?._id;

    // 2. Connect 3 Independent Sockets for Driver, Student, and Admin
    console.log('\n--- Step 2: Establish 3 Role Sockets (Driver, Student, Admin) ---');
    const driverSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    const studentSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    const adminSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    await new Promise((resolve, reject) => {
      let count = 0;
      const onConn = () => {
        count++;
        if (count === 3) resolve();
      };
      driverSocket.on('connect', onConn);
      studentSocket.on('connect', onConn);
      adminSocket.on('connect', onConn);
      setTimeout(() => reject(new Error('Connection timeout for 3 sockets')), 4000);
    });

    assert(driverSocket.connected && studentSocket.connected && adminSocket.connected, 'Driver, Student, and Admin sockets active');

    studentSocket.emit('join:campus_map');
    adminSocket.emit('join:campus_map');

    // 3. Driver starts trip
    console.log('\n--- Step 3: Driver Starts Trip & Broadcasts to Student and Admin ---');
    const studentTripStartPromise = new Promise((res) => studentSocket.once('bus:trip_started', res));
    const adminTripStartPromise = new Promise((res) => adminSocket.once('bus:trip_started', res));

    driverSocket.emit('driver:start_trip', {
      busId,
      routeId,
      driverId,
      isSimulated: true,
    });

    const [studentStartData, adminStartData] = await Promise.all([
      studentTripStartPromise,
      adminTripStartPromise,
    ]);

    assert(studentStartData.busId === busId, 'Student received bus:trip_started', `Bus: ${studentStartData.busNumber}`);
    assert(adminStartData.busId === busId, 'Admin received bus:trip_started', `Bus: ${adminStartData.busNumber}`);

    // Verify REST
    const liveCheck1 = await (await fetch(`${BASE_URL}/buses/${busId}/live`)).json();
    assert(liveCheck1.data.isTripActive === true, 'REST API reflects active trip');

    // 4. Driver streams GPS Location
    console.log('\n--- Step 4: GPS Telemetry Ingestion & Real-Time Broadcast ---');
    const studentLocPromise = new Promise((res) => studentSocket.once('bus:location_broadcast', res));
    const adminLocPromise = new Promise((res) => adminSocket.once('bus:location_broadcast', res));

    const testLat = 28.5418;
    const testLng = 77.1897;
    const testSpeed = 26;
    const testHeading = 90;

    driverSocket.emit('driver:location_update', {
      busId,
      lat: testLat,
      lng: testLng,
      speed: testSpeed,
      heading: testHeading,
      accuracy: 3,
      driverId,
      isSimulated: true,
    });

    const [studentLoc, adminLoc] = await Promise.all([
      studentLocPromise,
      adminLocPromise,
    ]);

    assert(studentLoc.coordinates.lat === testLat && studentLoc.speed === testSpeed, 'Student received live coordinates & speed', `${testSpeed} km/h`);
    assert(adminLoc.coordinates.lat === testLat && adminLoc.heading === testHeading, 'Admin received live coordinates & heading', `${testHeading}°`);
    assert(Array.isArray(studentLoc.etas) && studentLoc.etas.length > 0, 'Dynamic Stop ETAs generated', `Upcoming stops: ${studentLoc.etas.length}`);

    // 5. Driver updates status to 'delayed'
    console.log('\n--- Step 5: Operational Status Change & Buffer Recalculation ---');
    const studentStatusPromise = new Promise((res) => studentSocket.once('bus:status_updated', res));
    const adminStatusPromise = new Promise((res) => adminSocket.once('bus:status_updated', res));

    driverSocket.emit('bus:status_change', {
      busId,
      status: 'delayed',
      statusMessage: 'Heavy morning congestion near Administrative building',
    });

    const [studentStatus, adminStatus] = await Promise.all([
      studentStatusPromise,
      adminStatusPromise,
    ]);

    assert(studentStatus.status === 'delayed', 'Student received delayed status alert');
    assert(adminStatus.status === 'delayed', 'Admin received delayed status alert');
    assert(studentStatus.statusMessage.includes('Heavy morning congestion'), 'Custom broadcast message delivered to passengers');

    // 6. Driver ends trip
    console.log('\n--- Step 6: Driver Ends Trip & Sets Vehicle Out of Service ---');
    const studentEndPromise = new Promise((res) => studentSocket.once('bus:trip_ended', res));
    const adminEndPromise = new Promise((res) => adminSocket.once('bus:trip_ended', res));

    driverSocket.emit('driver:end_trip', { busId, driverId });

    const [studentEnd, adminEnd] = await Promise.all([
      studentEndPromise,
      adminEndPromise,
    ]);

    assert(studentEnd.busId === busId, 'Student received bus:trip_ended');
    assert(adminEnd.busId === busId, 'Admin received bus:trip_ended');

    // Disconnect sockets
    driverSocket.disconnect();
    studentSocket.disconnect();
    adminSocket.disconnect();

    console.log('\n================================================================');
    console.log(` 🎉 ALL ${passed}/${total} MULTI-ROLE REALTIME TESTS PASSED!`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
};

runE2EPhase2Test();
