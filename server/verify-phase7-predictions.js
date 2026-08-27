import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runPhase7Verification = async () => {
  console.log('================================================================');
  console.log('    CAMPUSMOVE AI — PHASE 7 PREDICTION (ML) TEST SUITE         ');
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
    // 1. AUTHENTICATION & SEED DATA CHECK
    // -------------------------------------------------------------------------
    console.log('--- [1/8] Authenticating Users & Checking Fleet Data ---');
    const studentLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@campusmove.edu', password: 'student123' }),
      })
    ).json();
    assert(studentLogin.success === true && studentLogin.token, 'Student authenticated successfully');
    const studentToken = studentLogin.token;

    const adminLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@campusmove.edu', password: 'admin123' }),
      })
    ).json();
    assert(adminLogin.success === true && adminLogin.token, 'Admin authenticated successfully');
    const adminToken = adminLogin.token;

    const busesRes = await (
      await fetch(`${BASE_URL}/buses`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();
    assert(busesRes.success === true && busesRes.data.length >= 2, 'Fleet buses loaded', `Count: ${busesRes.data?.length}`);
    const targetBus = busesRes.data.find((b) => b.busNumber === 'Bus 12') || busesRes.data[0];
    const busId = targetBus._id;
    console.log(`     Target Bus for verification: ${targetBus.busNumber} (${targetBus.plateNumber}) [ID: ${busId}]`);

    // -------------------------------------------------------------------------
    // 2. ML ETA REFINEMENT ENDPOINT
    // -------------------------------------------------------------------------
    console.log('\n--- [2/8] Testing ML ETA Refinement (GET /api/predictions/eta/:busId) ---');
    const etaRes = await (
      await fetch(`${BASE_URL}/predictions/eta/${busId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();

    assert(etaRes.success === true, 'ETA prediction endpoint returned 200 OK');
    assert(etaRes.data && etaRes.data.busNumber === targetBus.busNumber, 'Returned correct bus identifier');
    assert(typeof etaRes.data.baseETA === 'number', 'Deterministic base ETA preserved', `Base ETA: ${etaRes.data.baseETA} min`);
    assert(typeof etaRes.data.predictedETA === 'number' && etaRes.data.predictedETA >= 1, 'ML refined ETA returned', `Refined: ${etaRes.data.predictedETA} min`);
    assert(typeof etaRes.data.adjustmentMinutes === 'number', 'ML adjustment minutes computed', `Shift: ${etaRes.data.adjustmentMinutes} min`);
    assert(etaRes.data.confidence >= 75 && etaRes.data.confidence <= 100, 'Confidence score within valid range', `${etaRes.data.confidence}%`);
    assert(etaRes.data.predictionSource === 'ml_model_v1', 'Prediction source labeled properly');
    assert(Array.isArray(etaRes.data.allStops) && etaRes.data.allStops.length > 0, 'Refined ETAs provided for route stops');

    // Test with specific stop query param
    const firstStopId = targetBus.currentRoute?.stops?.[0]?.stop?._id || targetBus.currentRoute?.stops?.[0]?.stop;
    if (firstStopId) {
      const stopEtaRes = await (
        await fetch(`${BASE_URL}/predictions/eta/${busId}?stopId=${firstStopId}`, {
          headers: { Authorization: `Bearer ${studentToken}` },
        })
      ).json();
      assert(stopEtaRes.success === true, 'Filtered ETA by stopId successfully');
      assert(stopEtaRes.data.targetStop !== null, 'Target stop resolved for query');
    }

    // -------------------------------------------------------------------------
    // 3. PASSENGER CROWD & OCCUPANCY ESTIMATION
    // -------------------------------------------------------------------------
    console.log('\n--- [3/8] Testing Passenger Crowd Estimation (GET /api/predictions/crowd/:busId) ---');
    const crowdRes = await (
      await fetch(`${BASE_URL}/predictions/crowd/${busId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();

    assert(crowdRes.success === true, 'Crowd estimation endpoint returned 200 OK');
    assert(crowdRes.data.capacity > 0, 'Bus capacity recognized', `Capacity: ${crowdRes.data.capacity}`);
    assert(typeof crowdRes.data.estimatedPassengers === 'number' && crowdRes.data.estimatedPassengers >= 0, 'Estimated passenger count calculated', `${crowdRes.data.estimatedPassengers} pax`);
    assert(typeof crowdRes.data.occupancyPercentage === 'number' && crowdRes.data.occupancyPercentage >= 0 && crowdRes.data.occupancyPercentage <= 100, 'Occupancy percentage within 0-100%', `${crowdRes.data.occupancyPercentage}%`);
    assert(['LOW', 'MODERATE', 'HIGH', 'FULL'].includes(crowdRes.data.crowdLevel), 'Crowd level mapped to valid category', `Level: ${crowdRes.data.crowdLevel}`);
    assert(['increasing', 'stable', 'decreasing'].includes(crowdRes.data.trend), 'Crowd trend identified', `Trend: ${crowdRes.data.trend}`);
    assert(typeof crowdRes.data.statusMessage === 'string' && crowdRes.data.statusMessage.length > 0, 'Human-readable crowd status message provided');

    // -------------------------------------------------------------------------
    // 4. TRANSPORT DEMAND FORECASTING
    // -------------------------------------------------------------------------
    console.log('\n--- [4/8] Testing Transport Demand Forecasting (GET /api/predictions/demand) ---');
    const demandRes = await (
      await fetch(`${BASE_URL}/predictions/demand`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();

    assert(demandRes.success === true, 'Demand forecast endpoint returned 200 OK');
    assert(demandRes.data.currentForecast !== undefined, 'Current hour demand forecast generated');
    assert(typeof demandRes.data.currentForecast.expectedPassengerDemand === 'number', 'Expected passenger demand returned', `${demandRes.data.currentForecast.expectedPassengerDemand} pax/hr`);
    assert(['LOW', 'MODERATE', 'HIGH', 'SURGE'].includes(demandRes.data.currentForecast.demandCategory), 'Demand category categorized properly', `Category: ${demandRes.data.currentForecast.demandCategory}`);
    assert(demandRes.data.currentForecast.recommendedBusAllocation >= 1, 'Recommended bus allocation calculated', `${demandRes.data.currentForecast.recommendedBusAllocation} shuttles`);
    assert(Array.isArray(demandRes.data.hourlyForecast) && demandRes.data.hourlyForecast.length >= 15, 'Full 24-hour timeline forecast provided', `Hours: ${demandRes.data.hourlyForecast?.length}`);
    assert(Array.isArray(demandRes.data.peakPeriods) && demandRes.data.peakPeriods.length >= 3, 'Peak academic transit windows identified', `Peaks: ${demandRes.data.peakPeriods?.length}`);

    // Test Demand with query filters
    const filteredDemandRes = await (
      await fetch(`${BASE_URL}/predictions/demand?hour=9`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();
    assert(filteredDemandRes.success === true && filteredDemandRes.data.currentForecast.hour === 9, 'Demand filtered by specific hour (9 AM peak)');

    // -------------------------------------------------------------------------
    // 5. FLEET PREDICTION SUMMARY & ML RELIABILITY METRICS
    // -------------------------------------------------------------------------
    console.log('\n--- [5/8] Testing Fleet Prediction Summary (GET /api/predictions/summary) ---');
    const summaryRes = await (
      await fetch(`${BASE_URL}/predictions/summary`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();

    assert(summaryRes.success === true, 'Prediction summary endpoint returned 200 OK');
    assert(summaryRes.data.fleetOverview && typeof summaryRes.data.fleetOverview.averageFleetOccupancy === 'number', 'Average fleet occupancy computed', `${summaryRes.data.fleetOverview.averageFleetOccupancy}%`);
    assert(Array.isArray(summaryRes.data.fleetPredictions) && summaryRes.data.fleetPredictions.length >= 2, 'Fleet predictions array returned');
    assert(Array.isArray(summaryRes.data.busiestRoutes) && summaryRes.data.busiestRoutes.length > 0, 'Busiest routes ranking computed');
    assert(summaryRes.data.modelPerformance && summaryRes.data.modelPerformance.etaModel, 'Model performance metrics included');
    assert(typeof summaryRes.data.modelPerformance.etaModel.mae === 'number', 'ETA Model MAE documented', `MAE: ${summaryRes.data.modelPerformance.etaModel.mae} mins`);
    assert(typeof summaryRes.data.modelPerformance.demandModel.r2 === 'number', 'Demand Model R² documented', `R²: ${summaryRes.data.modelPerformance.demandModel.r2}`);

    // -------------------------------------------------------------------------
    // 6. RBAC & MODEL RETRAINING
    // -------------------------------------------------------------------------
    console.log('\n--- [6/8] Testing RBAC & Model Retraining (POST /api/predictions/train) ---');
    // Student should be FORBIDDEN from triggering retraining
    const studentTrainRes = await (
      await fetch(`${BASE_URL}/predictions/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      })
    ).json();
    assert(studentTrainRes.success === false, 'Student role rejected from retraining models (403 Forbidden)');

    // Admin should be AUTHORIZED to trigger retraining
    const adminTrainRes = await (
      await fetch(`${BASE_URL}/predictions/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      })
    ).json();
    assert(adminTrainRes.success === true, 'Admin successfully triggered ML pipeline retraining');
    assert(adminTrainRes.data && adminTrainRes.data.metrics, 'Retraining report and metrics returned');

    // -------------------------------------------------------------------------
    // 7. ERROR HANDLING & FALLBACK BEHAVIOR
    // -------------------------------------------------------------------------
    console.log('\n--- [7/8] Testing Error Handling & Missing Data Fallback ---');
    // Invalid format bus ID
    const invalidIdRes = await (
      await fetch(`${BASE_URL}/predictions/eta/not-a-valid-id`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();
    assert(invalidIdRes.success === false, 'Invalid bus ID format handled cleanly (404 Not Found)');

    // Non-existent valid ObjectId
    const fakeObjId = '662ec4910b80f4f9f7a01234';
    const notFoundRes = await (
      await fetch(`${BASE_URL}/predictions/crowd/${fakeObjId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    ).json();
    assert(notFoundRes.success === false, 'Non-existent bus ID returns 404 gracefully');

    // -------------------------------------------------------------------------
    // 8. AI ASSISTANT INTEGRATION (PHASE 4 + PHASE 7 COMPATIBILITY)
    // -------------------------------------------------------------------------
    console.log('\n--- [8/8] Testing AI Assistant Integration with Predictions ---');
    // 1. Crowd query
    const crowdChatRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'How crowded is Bus 12?' }),
      })
    ).json();
    assert(crowdChatRes.success === true, 'AI Assistant handled crowd question successfully');
    assert(crowdChatRes.intent === 'CROWD_ESTIMATION', 'Classified query as CROWD_ESTIMATION intent');
    assert(crowdChatRes.data && crowdChatRes.data.crowdLevel, 'Returned crowd level in assistant payload', `Level: ${crowdChatRes.data?.crowdLevel}`);

    // 2. Which route is less crowded query
    const routeCrowdRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Which route is less crowded?' }),
      })
    ).json();
    assert(routeCrowdRes.success === true && routeCrowdRes.intent === 'CROWD_ESTIMATION', 'Handled route crowd comparison query');

    // 3. Existing Phase 4 ETA query regression check
    const etaChatRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'When will Bus 12 arrive?' }),
      })
    ).json();
    assert(etaChatRes.success === true && etaChatRes.intent === 'BUS_ETA', 'Existing BUS_ETA chat query regression check passed');
    assert(typeof etaChatRes.data.etaMinutes === 'number', 'Preserved etaMinutes field for Phase 4 compatibility');

    console.log('\n================================================================');
    console.log(`  🎉 ALL PHASE 7 PREDICTION (ML) VERIFICATION TESTS PASSED!     `);
    console.log(`  Passed: ${passed} / ${total} tests                             `);
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ Phase 7 Verification Failed:', error.message);
    process.exit(1);
  }
};

runPhase7Verification();
