import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runPhase4Verification = async () => {
  console.log('================================================================');
  console.log('    CAMPUSMOVE AI — PHASE 4 AI ASSISTANT VERIFICATION SUITE    ');
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
    // 1. Test Assistant Suggestions API
    console.log('--- [1/9] Testing Assistant Suggestions Endpoint ---');
    const suggRes = await (await fetch(`${BASE_URL}/assistant/suggestions`)).json();
    assert(suggRes.success === true, 'Assistant suggestions endpoint returned successfully');
    assert(Array.isArray(suggRes.data) && suggRes.data.length >= 5, 'Multiple query suggestions provided', `Count: ${suggRes.data?.length}`);

    // 2. Test BUS_ETA Intent: "When will Bus 12 arrive?"
    console.log('\n--- [2/9] Testing BUS_ETA Query ("When will Bus 12 arrive?") ---');
    const etaRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'When will Bus 12 arrive?',
        }),
      })
    ).json();

    assert(etaRes.success === true, 'Bus ETA query processed');
    assert(etaRes.intent === 'BUS_ETA', 'Correctly classified as BUS_ETA intent');
    assert(typeof etaRes.response === 'string' && etaRes.response.includes('Bus 12'), 'Response mentions Bus 12', etaRes.response);
    assert(etaRes.data && etaRes.data.busNumber === 'Bus 12', 'Structured data returned target bus metadata');
    assert(typeof etaRes.data.etaMinutes === 'number', 'Accurate ETA minutes included in payload', `${etaRes.data.etaMinutes} min`);

    // 3. Test BUS_LOCATION Intent: "Where is Bus 04 right now?"
    console.log('\n--- [3/9] Testing BUS_LOCATION Query ("Where is Bus 04 right now?") ---');
    const locRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Where is Bus 04 right now?',
        }),
      })
    ).json();

    assert(locRes.success === true, 'Bus location query processed');
    assert(locRes.intent === 'BUS_LOCATION', 'Correctly classified as BUS_LOCATION intent');
    assert(locRes.data && locRes.data.busNumber === 'Bus 04', 'Returned Bus 04 tracking details');
    assert(locRes.data.location && typeof locRes.data.location.lat === 'number', 'Returned live GPS coordinates', `[${locRes.data.location.lat}, ${locRes.data.location.lng}]`);

    // 4. Test ROUTE_SEARCH with Full Details (Tool Calling Phase 3 Trip Planner)
    console.log('\n--- [4/9] Testing Full Trip Query ("I need to reach college from Hostel 3 by 9 AM") ---');
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
    assert(tripRes.intent === 'ROUTE_SEARCH', 'Correctly classified as ROUTE_SEARCH intent');
    assert(tripRes.trip !== undefined && tripRes.trip.recommendation !== null, 'Successfully tool-called Phase 3 Trip Planner');
    assert(typeof tripRes.response === 'string' && tripRes.response.length > 20, 'Natural language explanation returned', tripRes.response);
    assert(tripRes.data && tripRes.data.origin && tripRes.data.destination, 'Structured origin/destination returned');

    // 5. Test Missing Information Handling: "Find me a bus to college"
    console.log('\n--- [5/9] Testing Missing Parameter Handling ("Find me a bus to college") ---');
    const missingRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Find me a bus to college',
        }),
      })
    ).json();

    assert(missingRes.success === true, 'Incomplete query handled gracefully');
    assert(missingRes.intent === 'ROUTE_SEARCH', 'Classified as ROUTE_SEARCH');
    assert(missingRes.data && Array.isArray(missingRes.data.missing) && missingRes.data.missing.includes('origin'), 'Detected missing origin entity');
    assert(missingRes.response.toLowerCase().includes('starting from') || missingRes.response.toLowerCase().includes('where are you'), 'Politely prompts student for starting location');

    // 6. Test Delayed Bus Alternative Query
    console.log('\n--- [6/9] Testing Delay Alternative Query ("Bus 04 is delayed. What should I take instead?") ---');
    const altRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Bus 04 is delayed. What should I take instead?',
          context: { currentTime: '08:35' },
        }),
      })
    ).json();

    assert(altRes.success === true, 'Delay alternative query handled successfully');
    assert(altRes.intent === 'ROUTE_SEARCH', 'Classified as ROUTE_SEARCH for alternative planning');
    assert(altRes.trip !== undefined, 'Provided alternative trip recommendation');

    // 7. Test NEXT_STOP Intent: "What is the next stop for Bus 12?"
    console.log('\n--- [7/9] Testing NEXT_STOP Query ("What is the next stop for Bus 12?") ---');
    const nextStopRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is the next stop for Bus 12?',
        }),
      })
    ).json();

    assert(nextStopRes.success === true, 'Next stop query handled successfully');
    assert(nextStopRes.intent === 'NEXT_STOP', 'Classified as NEXT_STOP intent');
    assert(nextStopRes.data && nextStopRes.data.nextStop && nextStopRes.data.nextStop.stopName, 'Returned next upcoming stop metadata');

    // 8. Test BUS_STATUS Intent: "Show delayed buses"
    console.log('\n--- [8/9] Testing BUS_STATUS Query ("Show delayed buses") ---');
    const statusRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Show delayed buses',
        }),
      })
    ).json();

    assert(statusRes.success === true, 'Bus status query handled successfully');
    assert(statusRes.intent === 'BUS_STATUS', 'Classified as BUS_STATUS intent');
    assert(typeof statusRes.response === 'string' && statusRes.response.includes('Bus 04'), 'Identified delayed Bus 04');

    // 9. Test Alias /api/agent/chat & GENERAL_HELP
    console.log('\n--- [9/9] Testing Alias /api/agent/chat & GENERAL_HELP ("Help") ---');
    const agentAliasRes = await (
      await fetch(`${BASE_URL}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Help! What can you do?',
        }),
      })
    ).json();

    assert(agentAliasRes.success === true, '/api/agent/chat alias endpoint is operational');
    assert(agentAliasRes.intent === 'GENERAL_HELP', 'Classified as GENERAL_HELP intent');
    assert(agentAliasRes.data && Array.isArray(agentAliasRes.data.suggestedQueries), 'Returned list of suggested capabilities');

    console.log('\n================================================================');
    console.log(` ✨ ALL PHASE 4 AI ASSISTANT TESTS PASSED! (${passed}/${total})`);
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ Phase 4 Verification Failed:', error.message);
    process.exit(1);
  }
};

runPhase4Verification();
