import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runPhase4AIAssistantVerification = async () => {
  console.log('================================================================');
  console.log('    CAMPUSMOVE AI — PHASE 4 AI TRANSPORT ASSISTANT TEST SUITE   ');
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
    // 1. Assistant Endpoint Availability & Suggestions
    console.log('--- [1/9] Testing Assistant Suggestions Endpoint ---');
    const suggRes = await (await fetch(`${BASE_URL}/assistant/suggestions`)).json();
    assert(suggRes.success === true, 'Assistant suggestions endpoint is available');
    assert(Array.isArray(suggRes.data) && suggRes.data.length >= 5, 'Returned starter prompt suggestions', `Count: ${suggRes.data?.length}`);

    // 2. Bus Location Intent
    console.log('\n--- [2/9] Testing BUS_LOCATION Intent ("Where is Bus 12?") ---');
    const locRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Where is Bus 12?',
        }),
      })
    ).json();

    assert(locRes.success === true, 'Bus location query handled successfully');
    assert(locRes.intent === 'BUS_LOCATION', 'Intent correctly identified as BUS_LOCATION');
    assert(locRes.data && locRes.data.busNumber === 'Bus 12', 'Returned Bus 12 metadata');
    assert(locRes.data.location && typeof locRes.data.location.lat === 'number', 'Included real GPS coordinates', `[${locRes.data.location.lat}, ${locRes.data.location.lng}]`);
    assert(typeof (locRes.answer || locRes.response) === 'string', 'Answer payload populated');

    // 3. Bus Status & Active Buses Intent
    console.log('\n--- [3/9] Testing BUS_STATUS Intent ("Show delayed buses") ---');
    const statusRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Show delayed buses',
        }),
      })
    ).json();

    assert(statusRes.success === true, 'Delayed bus status query handled');
    assert(statusRes.intent === 'BUS_STATUS', 'Intent correctly identified as BUS_STATUS');
    assert(statusRes.answer.includes('Bus 04') || statusRes.response.includes('Bus 04'), 'Identified delayed Bus 04');

    // 4. Next Bus & ETA Intent
    console.log('\n--- [4/9] Testing BUS_ETA Intent ("When will Bus 12 arrive?") ---');
    const etaRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'When will Bus 12 arrive?',
        }),
      })
    ).json();

    assert(etaRes.success === true, 'Bus ETA query processed successfully');
    assert(etaRes.intent === 'BUS_ETA', 'Intent correctly identified as BUS_ETA');
    assert(typeof etaRes.data.etaMinutes === 'number', 'Calculated dynamic ETA in minutes', `${etaRes.data.etaMinutes} min`);
    assert(etaRes.data.routeCode !== undefined, 'Associated route code returned');

    // 5. Route Discovery Intent ("Which bus goes to the hostel?" / "Show available routes")
    console.log('\n--- [5/9] Testing Route Discovery ("Which bus goes to the hostel?" & "Show available routes.") ---');
    const whichBusRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Which bus goes to the hostel?',
        }),
      })
    ).json();

    assert(whichBusRes.success === true, 'Destination inquiry handled');
    assert(whichBusRes.intent === 'ROUTE_SEARCH', 'Classified as ROUTE_SEARCH intent');
    assert(whichBusRes.data && whichBusRes.data.destination, 'Extracted destination stop entity');
    assert(whichBusRes.answer.includes('Route') || whichBusRes.answer.includes('Bus'), 'Identified serving routes and buses');

    const routesRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Show available routes.',
        }),
      })
    ).json();

    assert(routesRes.success === true, 'Available routes list processed');
    assert(routesRes.data && Array.isArray(routesRes.data.routes) && routesRes.data.routes.length >= 3, 'All campus routes enumerated');

    // 6. Trip Planning Integration (Reusing Phase 3 Trip Planner Engine)
    console.log('\n--- [6/9] Testing Trip Planning ("I need to reach college from Hostel 3 by 9 AM") ---');
    const tripRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'I need to reach college from Hostel 3 by 9 AM',
          context: { currentTime: '08:35' },
        }),
      })
    ).json();

    assert(tripRes.success === true, 'Trip planning query handled successfully');
    assert(tripRes.intent === 'ROUTE_SEARCH' || tripRes.intent === 'TRIP_PLANNING', 'Classified as ROUTE_SEARCH / TRIP_PLANNING');
    assert(tripRes.trip !== undefined && tripRes.trip.recommendation !== null, 'Reused Phase 3 Trip Planner Engine');
    assert(tripRes.data && tripRes.data.origin && tripRes.data.destination, 'Structured origin/destination returned');
    assert(typeof (tripRes.answer || tripRes.response) === 'string', 'Natural language explanation provided');

    // 7. Unknown Bus Handling
    console.log('\n--- [7/9] Testing Unknown Bus Handling ("Where is Bus 99?") ---');
    const unknownBusRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Where is Bus 99?',
        }),
      })
    ).json();

    assert(unknownBusRes.success === true, 'Non-existent bus handled gracefully without crashing');
    assert(unknownBusRes.intent === 'BUS_LOCATION', 'Classified as BUS_LOCATION');
    assert(
      (unknownBusRes.answer || unknownBusRes.response).toLowerCase().includes('unavailable') ||
        (unknownBusRes.answer || unknownBusRes.response).toLowerCase().includes('not found') ||
        (unknownBusRes.answer || unknownBusRes.response).toLowerCase().includes('not active'),
      'Politely notifies student that bus is not active'
    );

    // 8. Unknown Stop / Incomplete Query Handling
    console.log('\n--- [8/9] Testing Incomplete Query Handling ("Find me a bus to college") ---');
    const missingOriginRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Find me a bus to college',
        }),
      })
    ).json();

    assert(missingOriginRes.success === true, 'Missing origin query handled politely');
    assert(missingOriginRes.data && Array.isArray(missingOriginRes.data.missing) && missingOriginRes.data.missing.includes('origin'), 'Flagged missing origin entity');

    // 9. Fallback Mode & General Help ("Who wrote Hamlet?" & "Help")
    console.log('\n--- [9/9] Testing Off-topic Query Fallback & General Help ---');
    const helpRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Who wrote Hamlet?',
        }),
      })
    ).json();

    assert(helpRes.success === true, 'Off-topic query handled cleanly without LLM error');
    assert(helpRes.intent === 'GENERAL_HELP', 'Fell back to GENERAL_HELP intent');
    assert(helpRes.data && Array.isArray(helpRes.data.suggestedQueries), 'Offered clear suggested transit queries');

    console.log('\n================================================================');
    console.log(` ✨ ALL PHASE 4 AI ASSISTANT TESTS PASSED! (${passed}/${total})`);
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ Phase 4 Verification Failed:', error.message);
    process.exit(1);
  }
};

runPhase4AIAssistantVerification();
