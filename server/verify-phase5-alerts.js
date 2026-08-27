import dotenv from 'dotenv';
dotenv.config();

import { connectDB, closeDB } from './src/config/db.js';
import { geofenceService } from './src/services/geofenceService.js';

const BASE_URL = 'http://localhost:5000/api';

const runPhase5Verification = async () => {
  console.log('================================================================');
  console.log('  CAMPUSMOVE AI — PHASE 5 SMART ALERTS & GEOFENCING TEST SUITE  ');
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
    await connectDB();

    // 1. Authenticate Student & Admin
    console.log('--- [1/8] Authenticating Users for RBAC Alert Verification ---');
    const studentLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@campusmove.edu', password: 'student123' }),
      })
    ).json();

    assert(studentLogin.success === true && studentLogin.token, 'Student authentication successful');
    const studentToken = studentLogin.token;

    const adminLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@campusmove.edu', password: 'admin123' }),
      })
    ).json();

    assert(adminLogin.success === true && adminLogin.token, 'Admin authentication successful');
    const adminToken = adminLogin.token;

    // 2. Test Admin Manual Alert Creation & REST Endpoints
    console.log('\n--- [2/8] Testing Alert Creation & REST API Endpoints ---');
    const createAlertRes = await (
      await fetch(`${BASE_URL}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Campus Weather Advisory',
          message: 'Heavy rain predicted around 5 PM. Shuttles running with extra frequency.',
          type: 'general',
          severity: 'info',
          targetAudience: 'all',
        }),
      })
    ).json();

    assert(createAlertRes.success === true, 'Admin manual alert created successfully');
    assert(createAlertRes.data && createAlertRes.data.title === 'Campus Weather Advisory', 'Alert document returned with expected fields');
    const alertId = createAlertRes.data._id;

    // 3. Test Student Alerts Retrieval & Unread Counts
    console.log('\n--- [3/8] Testing Student Alert Retrieval & Read Status ---');
    const getAlertsRes = await (
      await fetch(`${BASE_URL}/alerts`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();

    assert(getAlertsRes.success === true, 'Student fetched alerts list');
    assert(Array.isArray(getAlertsRes.data) && getAlertsRes.data.length > 0, 'Alerts array populated', `Count: ${getAlertsRes.data.length}`);
    assert(typeof getAlertsRes.unreadCount === 'number', 'Unread count computed', `Unread: ${getAlertsRes.unreadCount}`);

    // Mark as read
    const markReadRes = await (
      await fetch(`${BASE_URL}/alerts/${alertId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();

    assert(markReadRes.success === true && markReadRes.data.isRead === true, 'Alert marked as read by student');

    // 4. Test Student Notification Preferences
    console.log('\n--- [4/8] Testing Alert Notification Preferences ---');
    const prefRes = await (
      await fetch(`${BASE_URL}/alerts/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          notifyBusDelays: true,
          notifyGeofence: true,
          notifyBusArrival: true,
          notifyRouteUpdates: false,
        }),
      })
    ).json();

    assert(prefRes.success === true, 'Notification preferences updated');
    assert(prefRes.data.notifyGeofence === true && prefRes.data.notifyRouteUpdates === false, 'Preferences persisted accurately');

    // 5. Test Real Geofence Proximity Detection
    console.log('\n--- [5/8] Testing Geofence Proximity Detection & Alert Generation ---');
    // Fetch stops & buses to get coordinates
    const stopsRes = await (await fetch(`${BASE_URL}/stops`)).json();
    const busesRes = await (await fetch(`${BASE_URL}/buses`)).json();

    const h3Stop = stopsRes.data.find((s) => s.code === 'H3');
    const bus12 = busesRes.data.find((b) => b.busNumber === 'Bus 12');

    assert(h3Stop && bus12, 'Retrieved Hostel 3 stop and Bus 12 metadata');

    geofenceService.resetState();

    // Location inside Hostel 3 geofence (coordinates within ~30m)
    const insideCoords = {
      lat: h3Stop.coordinates.lat + 0.0002,
      lng: h3Stop.coordinates.lng + 0.0002,
      speed: 15,
    };

    const geofenceAlerts = await geofenceService.processBusLocation(bus12, insideCoords);
    assert(geofenceAlerts.length > 0, 'Geofence proximity entry alert triggered', `Generated: ${geofenceAlerts.length}`);
    assert(geofenceAlerts[0].type === 'geofence_entered', 'Alert type classified as geofence_entered');
    assert(geofenceAlerts[0].title.includes('Hostel 3'), 'Alert title correctly references approaching Hostel 3');

    // 6. Test Duplicate Alert Prevention (No Flooding)
    console.log('\n--- [6/8] Testing Duplicate Geofence Flood Prevention ---');
    const duplicateCheck = await geofenceService.processBusLocation(bus12, {
      lat: insideCoords.lat + 0.00001,
      lng: insideCoords.lng + 0.00001,
      speed: 14,
    });
    assert(duplicateCheck.length === 0, 'Duplicate alert prevented while bus remains inside geofence');

    // 7. Test Bus Status Change Alert (Active -> Delayed)
    console.log('\n--- [7/8] Testing Bus Delayed Alert Generation ---');
    const delayAlert = await geofenceService.processStatusChange(
      bus12,
      'active',
      'delayed',
      'Heavy pedestrian rush at Main Gate'
    );

    assert(delayAlert !== null, 'Bus delay alert generated on status transition');
    assert(delayAlert.type === 'bus_delayed', 'Alert type set to bus_delayed');
    assert(delayAlert.severity === 'warning', 'Severity escalated to warning');

    // 8. Test Bus Resumed Normal Service Alert (Delayed -> Active)
    console.log('\n--- [8/8] Testing Bus Resumed Normal Service Alert ---');
    const resumeAlert = await geofenceService.processStatusChange(
      bus12,
      'delayed',
      'active'
    );

    assert(resumeAlert !== null, 'Bus resumed alert generated');
    assert(resumeAlert.title.includes('Resumed Normal Service'), 'Title indicates resumed service');
    assert(resumeAlert.severity === 'info', 'Severity set to info');

    console.log('\n================================================================');
    console.log(` 🎉 ALL PHASE 5 SMART ALERTS & GEOFENCING TESTS PASSED! (${passed}/${total})`);
    console.log('================================================================\n');

    await closeDB();
  } catch (error) {
    console.error('\n❌ Phase 5 Verification Failed:', error.message);
    await closeDB().catch(() => {});
    process.exit(1);
  }
};

runPhase5Verification();
