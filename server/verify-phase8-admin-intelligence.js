import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runPhase8Verification = async () => {
  console.log('================================================================');
  console.log('  CAMPUSMOVE AI — PHASE 8 ADMIN INTELLIGENCE TEST SUITE        ');
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
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION & RBAC ROLES
    // -------------------------------------------------------------------------
    console.log('--- [1/11] Authenticating Admin and Student Accounts ---');
    const adminLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@campusmove.edu', password: 'admin123' }),
      })
    ).json();
    assert(adminLogin.success === true && adminLogin.token, 'Admin authenticated successfully');
    const adminToken = adminLogin.token;

    const studentLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@campusmove.edu', password: 'student123' }),
      })
    ).json();
    assert(studentLogin.success === true && studentLogin.token, 'Student authenticated successfully');
    const studentToken = studentLogin.token;

    // -------------------------------------------------------------------------
    // 2. RBAC ACCESS CONTROL & STUDENT REJECTION
    // -------------------------------------------------------------------------
    console.log('\n--- [2/11] Testing RBAC Security & Student Access Rejection ---');
    const unauthRes = await (await fetch(`${BASE_URL}/analytics/overview`)).json();
    assert(unauthRes.success === false, 'Unauthenticated user rejected from /api/analytics/overview (401)');

    const studentRes = await (
      await fetch(`${BASE_URL}/analytics/overview`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();
    assert(studentRes.success === false, 'Student role rejected from /api/analytics/overview (403 Forbidden)');

    // -------------------------------------------------------------------------
    // 3. SYSTEM OVERVIEW & FLEET HEALTH SCORE
    // -------------------------------------------------------------------------
    console.log('\n--- [3/11] Testing Overview Analytics (GET /api/analytics/overview) ---');
    const overviewRes = await (
      await fetch(`${BASE_URL}/analytics/overview`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(overviewRes.success === true, 'Overview analytics endpoint returned 200 OK');
    assert(overviewRes.data.fleet && typeof overviewRes.data.fleet.totalBuses === 'number', 'Fleet status metrics returned', `Total: ${overviewRes.data.fleet.totalBuses}`);
    assert(overviewRes.data.network && typeof overviewRes.data.network.totalRoutes === 'number', 'Network routes & stops returned', `Routes: ${overviewRes.data.network.totalRoutes}`);
    assert(overviewRes.data.operations && typeof overviewRes.data.operations.completedTrips === 'number', 'Operations trip totals calculated', `Completed: ${overviewRes.data.operations.completedTrips}`);
    assert(overviewRes.data.support && typeof overviewRes.data.support.openComplaints === 'number', 'Support ticket queues included');
    assert(typeof overviewRes.data.fleetHealthScore === 'number' && overviewRes.data.fleetHealthScore >= 0 && overviewRes.data.fleetHealthScore <= 100, 'Fleet health score computed (0-100)', `Score: ${overviewRes.data.fleetHealthScore}`);
    assert(typeof overviewRes.data.healthRating === 'string', 'Health rating tier categorized', `Rating: ${overviewRes.data.healthRating}`);

    // -------------------------------------------------------------------------
    // 4. FLEET UTILIZATION ANALYTICS
    // -------------------------------------------------------------------------
    console.log('\n--- [4/11] Testing Fleet Utilization (GET /api/analytics/fleet) ---');
    const fleetRes = await (
      await fetch(`${BASE_URL}/analytics/fleet`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(fleetRes.success === true, 'Fleet analytics endpoint returned 200 OK');
    assert(fleetRes.data.fleetSize >= 1, 'Fleet size recognized', `Size: ${fleetRes.data.fleetSize}`);
    assert(typeof fleetRes.data.averageFleetUtilization === 'number', 'Average fleet utilization computed', `Avg: ${fleetRes.data.averageFleetUtilization}%`);
    assert(fleetRes.data.mostUtilizedBus !== undefined, 'Most utilized bus identified');
    assert(Array.isArray(fleetRes.data.buses) && fleetRes.data.buses.length >= 1, 'Per-bus metrics array returned');
    assert(typeof fleetRes.data.buses[0].reliabilityScore === 'number', 'Per-bus reliability score calculated', `Score: ${fleetRes.data.buses[0].reliabilityScore}`);

    // -------------------------------------------------------------------------
    // 5. ROUTE PERFORMANCE ANALYTICS
    // -------------------------------------------------------------------------
    console.log('\n--- [5/11] Testing Route Analytics (GET /api/analytics/routes) ---');
    const routeRes = await (
      await fetch(`${BASE_URL}/analytics/routes`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(routeRes.success === true, 'Route analytics endpoint returned 200 OK');
    assert(routeRes.data.totalRoutes >= 1, 'Route count returned');
    assert(routeRes.data.busiestRoute !== null, 'Busiest route corridor identified');
    assert(Array.isArray(routeRes.data.routes) && routeRes.data.routes.length >= 1, 'Route performance roster returned');
    assert(routeRes.data.routes[0].demandLevel !== undefined, 'Route demand tier categorized', `Demand: ${routeRes.data.routes[0].demandLevel}`);

    // -------------------------------------------------------------------------
    // 6. COMPLAINT ANALYTICS
    // -------------------------------------------------------------------------
    console.log('\n--- [6/11] Testing Complaint Analytics (GET /api/analytics/complaints) ---');
    const complaintRes = await (
      await fetch(`${BASE_URL}/analytics/complaints`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(complaintRes.success === true, 'Complaint analytics endpoint returned 200 OK');
    assert(typeof complaintRes.data.totalComplaints === 'number', 'Total complaints count aggregated', `Total: ${complaintRes.data.totalComplaints}`);
    assert(complaintRes.data.statusBreakdown !== undefined, 'Status breakdown computed');
    assert(complaintRes.data.byCategory !== undefined, 'Category distribution calculated');
    assert(typeof complaintRes.data.averageResolutionTimeMinutes === 'number', 'Average resolution time calculated', `${complaintRes.data.averageResolutionTimeMinutes} mins`);
    assert(Array.isArray(complaintRes.data.complaintsOverTime), 'Time-series timeline array returned');

    // -------------------------------------------------------------------------
    // 7. INCIDENT ANALYTICS
    // -------------------------------------------------------------------------
    console.log('\n--- [7/11] Testing Incident Analytics (GET /api/analytics/incidents) ---');
    const incidentRes = await (
      await fetch(`${BASE_URL}/analytics/incidents`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(incidentRes.success === true, 'Incident analytics endpoint returned 200 OK');
    assert(typeof incidentRes.data.totalIncidents === 'number', 'Total incidents count aggregated', `Total: ${incidentRes.data.totalIncidents}`);
    assert(incidentRes.data.bySeverity !== undefined, 'Severity distribution calculated');
    assert(incidentRes.data.byType !== undefined, 'Type breakdown calculated');
    assert(Array.isArray(incidentRes.data.highPriorityUnresolved), 'High-priority unresolved queue returned');

    // -------------------------------------------------------------------------
    // 8. PREDICTIVE ANALYTICS INTEGRATION (PHASE 7 INTEGRATION)
    // -------------------------------------------------------------------------
    console.log('\n--- [8/11] Testing Predictive Intelligence Integration (GET /api/analytics/predictions) ---');
    const predictionRes = await (
      await fetch(`${BASE_URL}/analytics/predictions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(predictionRes.success === true, 'Predictive analytics endpoint returned 200 OK');
    assert(Array.isArray(predictionRes.data.predictedPeakHours), 'Peak hours breakdown returned');
    assert(typeof predictionRes.data.predictedDemand === 'number', 'Predicted demand returned', `${predictionRes.data.predictedDemand} pax/hr`);
    assert(typeof predictionRes.data.busiestPredictedTime === 'string', 'Busiest hour identified', `Peak: ${predictionRes.data.busiestPredictedTime}`);
    assert(typeof predictionRes.data.averagePredictedETAConfidence === 'number', 'Average ML ETA confidence returned', `${predictionRes.data.averagePredictedETAConfidence}%`);
    assert(Array.isArray(predictionRes.data.routesRequiringAdditionalBuses), 'Fleet allocation deficit routes identified');

    // -------------------------------------------------------------------------
    // 9. OPERATIONAL TRENDS (7d vs 30d)
    // -------------------------------------------------------------------------
    console.log('\n--- [9/11] Testing Operational Trends (GET /api/analytics/trends) ---');
    const trends7d = await (
      await fetch(`${BASE_URL}/analytics/trends?range=7d`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(trends7d.success === true && trends7d.data.daysCount === 7, '7-day operational trend timeline generated');
    assert(Array.isArray(trends7d.data.timeline) && trends7d.data.timeline.length === 7, '7 trend data points provided');

    const trends30d = await (
      await fetch(`${BASE_URL}/analytics/trends?range=30d`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();
    assert(trends30d.success === true && trends30d.data.daysCount === 30, '30-day operational trend timeline generated');
    assert(Array.isArray(trends30d.data.timeline) && trends30d.data.timeline.length === 30, '30 trend data points provided');

    // -------------------------------------------------------------------------
    // 10. PILOT READINESS DIAGNOSTIC CHECK
    // -------------------------------------------------------------------------
    console.log('\n--- [10/11] Testing Pilot Readiness Diagnostics (GET /api/analytics/pilot-readiness) ---');
    const readinessRes = await (
      await fetch(`${BASE_URL}/analytics/pilot-readiness`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();

    assert(readinessRes.success === true, 'Pilot readiness endpoint returned 200 OK');
    assert(typeof readinessRes.data.readinessScore === 'number' && readinessRes.data.readinessScore >= 80, 'Pilot readiness score computed', `Score: ${readinessRes.data.readinessScore}%`);
    assert(readinessRes.data.status === 'READY', 'Pilot readiness status set to READY', `Status: ${readinessRes.data.status}`);
    assert(Array.isArray(readinessRes.data.checks) && readinessRes.data.checks.length === 10, 'All 10 subsystem checks evaluated', `Count: ${readinessRes.data.checks.length}`);

    // -------------------------------------------------------------------------
    // 11. EDGE CASES & SAFE FALLBACKS
    // -------------------------------------------------------------------------
    console.log('\n--- [11/11] Testing Edge Cases & Safe Fallbacks ---');
    const invalidQueryTrend = await (
      await fetch(`${BASE_URL}/analytics/trends?range=invalid`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();
    assert(invalidQueryTrend.success === true, 'Invalid trend range safely falls back to default 7d');

    console.log('\n================================================================');
    console.log(' 🎉 ALL PHASE 8 ADMIN INTELLIGENCE VERIFICATION TESTS PASSED!    ');
    console.log(` Passed: ${passed} / ${total} assertions                           `);
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ Phase 8 Verification Failed:', error.message);
    process.exit(1);
  }
};

runPhase8Verification();
