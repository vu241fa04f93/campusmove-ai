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
    console.log('--- [1/12] Testing Assistant Suggestions Endpoint ---');
    const suggRes = await (await fetch(`${BASE_URL}/assistant/suggestions`)).json();
    assert(suggRes.success === true, 'Assistant suggestions endpoint returned successfully');
    assert(Array.isArray(suggRes.data) && suggRes.data.length >= 5, 'Multiple query suggestions provided', `Count: ${suggRes.data?.length}`);

    // 2. Test BUS_ETA Intent: "When will Bus 12 arrive?"
    console.log('\n--- [2/12] Testing BUS_ETA Query ("When will Bus 12 arrive?") ---');
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

    // 3. Test BUS_LOCATION Intent: "Where is Bus 12?"
    console.log('\n--- [3/12] Testing BUS_LOCATION Query ("Where is Bus 12?") ---');
    const locRes1 = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Where is Bus 12?',
        }),
      })
    ).json();

    assert(locRes1.success === true, 'Bus 12 location query processed');
    assert(locRes1.intent === 'BUS_LOCATION', 'Correctly classified as BUS_LOCATION intent');
    assert(locRes1.data && locRes1.data.busNumber === 'Bus 12', 'Returned Bus 12 tracking details');
    assert(locRes1.data.location && typeof locRes1.data.location.lat === 'number', 'Returned live GPS coordinates', `[${locRes1.data.location.lat}, ${locRes1.data.location.lng}]`);

    // 4. Test BUS_LOCATION with Unavailable Bus: "Where is Bus 99?"
    console.log('\n--- [4/12] Testing Unavailable Bus Location Query ("Where is Bus 99?") ---');
    const locRes2 = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Where is Bus 99?',
        }),
      })
    ).json();

    assert(locRes2.success === true, 'Unavailable bus handled cleanly');
    assert(locRes2.intent === 'BUS_LOCATION', 'Classified as BUS_LOCATION');
    assert(locRes2.response.toLowerCase().includes('unavailable') || locRes2.response.toLowerCase().includes('not active'), 'Politely notifies user that location is unavailable');

    // 5. Test "Which bus goes to the hostel?"
    console.log('\n--- [5/12] Testing Which Bus Query ("Which bus goes to the hostel?") ---');
    const whichBusRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Which bus goes to the hostel?',
        }),
      })
    ).json();

    assert(whichBusRes.success === true, 'Which bus query processed');
    assert(whichBusRes.intent === 'ROUTE_SEARCH', 'Classified as ROUTE_SEARCH intent');
    assert(whichBusRes.data && whichBusRes.data.destination, 'Identified hostel destination stop');
    assert(whichBusRes.response.includes('Route') || whichBusRes.response.includes('Bus'), 'Identified serving routes/buses', whichBusRes.response);

    // 6. Test NEXT_STOP Intent: "What is the next stop?"
    console.log('\n--- [6/12] Testing NEXT_STOP Query ("What is the next stop?") ---');
    const nextStopRes1 = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is the next stop?',
        }),
      })
    ).json();

    assert(nextStopRes1.success === true, 'General next stop query handled');
    assert(nextStopRes1.intent === 'NEXT_STOP', 'Classified as NEXT_STOP intent');
    assert(nextStopRes1.data && nextStopRes1.data.nextStop, 'Returned next stop information');

    // 7. Test NEXT_STOP Intent with Bus specified: "What is the next stop for Bus 12?"
    console.log('\n--- [7/12] Testing Specific NEXT_STOP Query ("What is the next stop for Bus 12?") ---');
    const nextStopRes2 = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is the next stop for Bus 12?',
        }),
      })
    ).json();

    assert(nextStopRes2.success === true, 'Specific next stop query handled');
    assert(nextStopRes2.intent === 'NEXT_STOP', 'Classified as NEXT_STOP intent');
    assert(nextStopRes2.data && nextStopRes2.data.busNumber === 'Bus 12', 'Returned next stop specifically for Bus 12');

    // 8. Test Available Routes Query: "Show available routes."
    console.log('\n--- [8/12] Testing Available Routes Query ("Show available routes.") ---');
    const availRoutesRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Show available routes.',
        }),
      })
    ).json();

    assert(availRoutesRes.success === true, 'Available routes query handled');
    assert(availRoutesRes.intent === 'ROUTE_SEARCH', 'Classified as ROUTE_SEARCH intent');
    assert(availRoutesRes.data && Array.isArray(availRoutesRes.data.routes) && availRoutesRes.data.routes.length >= 3, 'Returned full list of campus routes');
    assert(availRoutesRes.response.includes('R-101') || availRoutesRes.response.includes('Express'), 'Listed route details');

    // 9. Test ROUTE_SEARCH with Full Trip Details: "I need to reach college from Hostel 3 by 9 AM"
    console.log('\n--- [9/12] Testing Full Trip Query ("I need to reach college from Hostel 3 by 9 AM") ---');
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

    // 10. Test BUS_STATUS Intent: "Show delayed buses"
    console.log('\n--- [10/12] Testing BUS_STATUS Query ("Show delayed buses") ---');
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

    // 11. Test Unknown Question / GENERAL_HELP Fallback: "Who wrote Hamlet?"
    console.log('\n--- [11/12] Testing Unknown Question Fallback ("Who wrote Hamlet?") ---');
    const unknownRes = await (
      await fetch(`${BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Who wrote Hamlet?',
        }),
      })
    ).json();

    assert(unknownRes.success === true, 'Unknown question handled safely without error');
    assert(unknownRes.intent === 'GENERAL_HELP', 'Fell back to GENERAL_HELP intent');
    assert(unknownRes.data && Array.isArray(unknownRes.data.suggestedQueries), 'Provided helpful suggested transit questions');

    // 12. Test Agent Alias /api/agent/chat Endpoint
    console.log('\n--- [12/12] Testing Alias /api/agent/chat Endpoint ---');
    const agentAliasRes = await (
      await fetch(`${BASE_URL}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Help',
        }),
      })
    ).json();

    assert(agentAliasRes.success === true, '/api/agent/chat alias endpoint operational');
    assert(agentAliasRes.intent === 'GENERAL_HELP', 'Classified as GENERAL_HELP intent');

    console.log('\n================================================================');
    console.log(` ✨ ALL PHASE 4 AI ASSISTANT TESTS PASSED! (${passed}/${total})`);
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ Phase 4 Verification Failed:', error.message);
    process.exit(1);
  }
};

runPhase4Verification();
