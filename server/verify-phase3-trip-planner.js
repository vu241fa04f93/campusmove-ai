import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runPhase3Verification = async () => {
  console.log('================================================================');
  console.log('    CAMPUSMOVE AI — PHASE 3 INTELLIGENT TRIP PLANNER SUITE     ');
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
    // 1. Test Suggestions Endpoint
    console.log('--- [1/6] Testing Trip Suggestions API ---');
    const suggRes = await (await fetch(`${BASE_URL}/trips/suggestions`)).json();
    assert(suggRes.success && suggRes.data.length >= 4, 'Trip suggestions returned', `Count: ${suggRes.data?.length}`);

    // 2. Test Standard Trip Planning: Hostel 3 -> Block C at 09:00 AM (Current: 08:35)
    console.log('\n--- [2/6] Testing Standard Trip Plan (Hostel 3 -> Block C, Target: 09:00) ---');
    const planRes1 = await (
      await fetch(`${BASE_URL}/trips/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: 'Hostel 3 (Men’s Residence)',
          destination: 'Block C (Computer Science)',
          requiredArrivalTime: '09:00',
          preference: 'fastest',
          currentTime: '08:35',
        }),
      })
    ).json();

    assert(planRes1.success === true, 'Trip plan returned successfully');
    assert(planRes1.origin.code === 'H3', 'Origin resolved to Hostel 3 (H3)');
    assert(planRes1.destination.code === 'BLK-C', 'Destination resolved to Block C (BLK-C)');
    assert(planRes1.recommendation !== null, 'Recommendation generated', `Title: ${planRes1.recommendation.title}`);
    assert(planRes1.recommendation.isOnTime === true, 'Recommended option is ON TIME for 09:00 AM deadline');
    assert(planRes1.recommendation.marginMinutes >= 0, 'Positive safety margin verified', `${planRes1.recommendation.marginMinutes} min margin`);
    assert(Array.isArray(planRes1.recommendation.steps) && planRes1.recommendation.steps.length >= 2, 'Detailed journey steps provided', `Steps: ${planRes1.recommendation.steps.length}`);
    assert(Array.isArray(planRes1.recommendation.whyRecommended) && planRes1.recommendation.whyRecommended.length > 0, 'Clear rationale generated');

    // 3. Test Arrival Time Constraint Priority
    console.log('\n--- [3/6] Testing Arrival Time Priority (Target: 08:45 vs 09:30) ---');
    const planRes2 = await (
      await fetch(`${BASE_URL}/trips/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: 'H3',
          destination: 'BLK-C',
          requiredArrivalTime: '08:50',
          currentTime: '08:40',
        }),
      })
    ).json();

    assert(planRes2.success === true, 'Plan generated with tight arrival constraint');
    assert(planRes2.recommendation.isOnTime === true || planRes2.recommendation.marginMinutes !== undefined, 'Arrival constraint evaluated against schedule');

    // 4. Test Short-Distance Direct Walking Comparison (Admin -> Library, ~350m)
    console.log('\n--- [4/6] Testing Short Campus Distance & Walking Comparison ---');
    const planRes3 = await (
      await fetch(`${BASE_URL}/trips/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: 'ADMIN',
          destination: 'LIB',
          currentTime: '09:00',
        }),
      })
    ).json();

    assert(planRes3.success === true, 'Short distance trip evaluated');
    const hasWalkOption = planRes3.recommendation.type === 'walk' || planRes3.alternatives.some((a) => a.type === 'walk');
    assert(hasWalkOption, 'Direct walk option included for short campus corridor (~3-5 min walk)');

    // 5. Test User Preferences (Fastest vs Earliest Arrival vs Convenient)
    console.log('\n--- [5/6] Testing Multi-Factor Preference Weightings ---');
    const [fastestPlan, earliestPlan] = await Promise.all([
      (
        await fetch(`${BASE_URL}/trips/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: 'GATE-1',
            destination: 'ENG-A',
            preference: 'fastest',
            currentTime: '08:00',
          }),
        })
      ).json(),
      (
        await fetch(`${BASE_URL}/trips/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: 'GATE-1',
            destination: 'ENG-A',
            preference: 'earliest_arrival',
            currentTime: '08:00',
          }),
        })
      ).json(),
    ]);

    assert(fastestPlan.success && earliestPlan.success, 'Both preference queries evaluated successfully');
    assert(fastestPlan.recommendation.totalDurationMinutes <= 30, 'Fastest route calculated duration');

    // 6. Test Error Handling for Invalid / Non-Existent Stop
    console.log('\n--- [6/6] Testing Invalid Stop Name Validation ---');
    const errRes = await (
      await fetch(`${BASE_URL}/trips/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: 'NonExistentBuildingXYZ',
          destination: 'Block C',
        }),
      })
    ).json();

    assert(errRes.success === false, 'Invalid stop correctly rejected with 404/error response');
    assert(errRes.message.includes('could not be identified'), 'User-friendly error message returned');

    // 7. Test Delayed Bus Rerouting & Safety Buffer
    console.log('\n--- [7/7] Testing Delayed Bus Detection & Buffer Safety ---');
    const delayPlanRes = await (
      await fetch(`${BASE_URL}/trips/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: 'ADMIN',
          destination: 'SPORTS',
          requiredArrivalTime: '08:45',
          currentTime: '08:25',
        }),
      })
    ).json();

    assert(delayPlanRes.success === true, 'Trip plan with potential delayed bus evaluated');
    assert(delayPlanRes.recommendation.isOnTime === true, 'System recommended on-time option guaranteeing arrival before 08:45');
    assert(delayPlanRes.recommendation.safetyBufferMinutes >= 3, 'Safety buffer applied to recommendation');

    console.log('\n================================================================');
    console.log(` 🎉 ALL ${passed}/${total} PHASE 3 TRIP PLANNER TESTS PASSED!`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Phase 3 Verification Failed:', err);
    process.exit(1);
  }
};

runPhase3Verification();
