import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const runPhase2Verification = async () => {
  console.log('================================================================');
  console.log('    CAMPUSMOVE AI — PHASE 2 REAL-TIME BUS TRACKING TEST SUITE   ');
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
    // 1. Fetch initial buses to get Bus 12 ID
    console.log('--- [1/5] Fetching Initial Fleet Status ---');
    const busesRes = await (await fetch(`${BASE_URL}/buses`)).json();
    const bus12 = busesRes.data.find((b) => b.busNumber === 'Bus 12');
    assert(bus12 && bus12._id, 'Retrieved Bus 12 ID from API');
    const busId = bus12._id;
    const routeId = bus12.currentRoute?._id;

    // 2. Initialize Two Real-Time Sockets (Driver Socket & Student Socket)
    console.log('\n--- [2/5] Establishing Socket.IO Real-Time Channels ---');
    const driverSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    const studentSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    await new Promise((resolve, reject) => {
      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 2) resolve();
      };
      driverSocket.on('connect', onConnect);
      studentSocket.on('connect', onConnect);
      setTimeout(() => reject(new Error('Socket connection timeout')), 4000);
    });

    assert(driverSocket.connected && studentSocket.connected, 'Both Driver and Student sockets connected');

    // Student joins bus room and campus map
    studentSocket.emit('join:bus', busId);
    studentSocket.emit('join:campus_map');

    // 3. Test Trip Lifecycle (Start Trip Event)
    console.log('\n--- [3/5] Testing Driver Trip Start & Real-Time Broadcast ---');
    const startTripPromise = new Promise((resolve) => {
      studentSocket.once('bus:trip_started', (data) => {
        resolve(data);
      });
    });

    driverSocket.emit('driver:start_trip', {
      busId,
      routeId,
      driverId: bus12.currentDriver?._id,
      isSimulated: false,
    });

    const startTripEvent = await startTripPromise;
    assert(startTripEvent.busId === busId, 'Student received bus:trip_started event', `Bus: ${startTripEvent.busNumber}`);

    // Verify DB reflects trip status
    const liveBusRes1 = await (await fetch(`${BASE_URL}/buses/${busId}/live`)).json();
    assert(liveBusRes1.data.isTripActive === true, 'Database verified: isTripActive is true');

    // 4. Test GPS Location Ingestion, Distance & Stop ETA Calculation
    console.log('\n--- [4/5] Testing GPS Location Ingestion & ETA Calculation ---');
    const locationBroadcastPromise = new Promise((resolve) => {
      studentSocket.once('bus:location_broadcast', (data) => {
        resolve(data);
      });
    });

    // Send a location near Hostel 3 (lat: 28.5415, lng: 77.1895)
    const testLat = 28.5416;
    const testLng = 28.5416 ? 77.1896 : 77.1896;
    const testSpeed = 24.5;
    const testHeading = 42;

    driverSocket.emit('driver:location_update', {
      busId,
      lat: testLat,
      lng: testLng,
      speed: testSpeed,
      heading: testHeading,
      accuracy: 4,
      isSimulated: true,
    });

    const locationBroadcast = await locationBroadcastPromise;
    assert(locationBroadcast.busId === busId, 'Student received bus:location_broadcast event');
    assert(locationBroadcast.coordinates.lat === testLat, 'Broadcasted latitude matches sent GPS');
    assert(locationBroadcast.speed === testSpeed, 'Broadcasted speed matches telemetry (24.5 km/h)');
    assert(locationBroadcast.heading === testHeading, 'Broadcasted heading matches compass angle (42°)');
    assert(locationBroadcast.isSimulated === true, 'Broadcast accurately tags simulation flag');
    assert(Array.isArray(locationBroadcast.etas) && locationBroadcast.etas.length > 0, 'Dynamic Stop ETAs calculated', `Count: ${locationBroadcast.etas.length}`);

    const nextStopEta = locationBroadcast.etas.find((e) => e.isNext);
    assert(nextStopEta && nextStopEta.stopName, 'Nearest upcoming stop identified', `Next: ${nextStopEta?.stopName}, ETA: ~${nextStopEta?.estimatedMinutes}m`);

    // Verify REST Endpoint /api/buses/:id/live
    const liveBusRes2 = await (await fetch(`${BASE_URL}/buses/${busId}/live`)).json();
    assert(liveBusRes2.data.lastKnownLocation.lat === testLat, 'REST Endpoint GET /api/buses/:id/live returns updated coordinates');

    // 5. Test Trip End Event
    console.log('\n--- [5/5] Testing Driver Trip End & Off-Duty Cleanup ---');
    const endTripPromise = new Promise((resolve) => {
      studentSocket.once('bus:trip_ended', (data) => {
        resolve(data);
      });
    });

    driverSocket.emit('driver:end_trip', { busId });
    const endTripEvent = await endTripPromise;
    assert(endTripEvent.busId === busId, 'Student received bus:trip_ended event');

    // Verify DB reflects end of trip
    const liveBusRes3 = await (await fetch(`${BASE_URL}/buses/${busId}/live`)).json();
    assert(liveBusRes3.data.isTripActive === false && liveBusRes3.data.status === 'out_of_service', 'Database verified: trip ended and status set to out_of_service');

    // Clean up sockets
    driverSocket.disconnect();
    studentSocket.disconnect();

    console.log('\n================================================================');
    console.log(` 🎉 ALL PHASE 2 REAL-TIME TESTS PASSED: ${passedTests}/${totalTests} COMPLETED!`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Phase 2 Verification Failed:', err);
    process.exit(1);
  }
};

runPhase2Verification();
