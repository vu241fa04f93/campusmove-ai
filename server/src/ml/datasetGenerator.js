/**
 * CampusMove AI — Synthetic Historical Training Data Generator
 * 
 * Generates realistic, reproducible synthetic historical campus transit records
 * based on real campus mobility patterns:
 *  - Morning campus rush (08:00 - 10:00)
 *  - Lunch-time student flow (12:00 - 14:00)
 *  - Evening return rush (16:30 - 19:00)
 *  - Weekday vs weekend variance
 *  - Route characteristics & stop density
 *  - Weather and pedestrian congestion delays
 * 
 * Explicitly labeled: SYNTHETIC_CAMPUS_TRANSIT_DATASET_V1
 */

export const DATASET_METADATA = {
  version: '1.0.0',
  isSynthetic: true,
  generatorName: 'CampusMove Realistic Transit Pattern Simulator',
  description: 'Simulated 30-day historical telemetry, crowd counts, and demand logs for campus mobility ML models.',
};

/**
 * Seeded pseudo-random number generator for reproducibility
 */
class SeededRandom {
  constructor(seed = 42) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
  choice(array) {
    return array[Math.floor(this.next() * array.length)];
  }
  gaussian(mean = 0, stdev = 1) {
    const u1 = Math.max(1e-6, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdev + mean;
  }
}

/**
 * Calculate rush hour multiplier based on hour of day (0-23)
 */
export const getRushMultiplier = (hour) => {
  if (hour >= 8 && hour < 10) return 1.8; // Morning peak
  if (hour >= 12 && hour < 14) return 1.4; // Lunch transition
  if (hour >= 16.5 && hour < 19) return 1.7; // Evening dismissal peak
  if (hour >= 10 && hour < 12) return 1.1; // Mid-morning
  if (hour >= 14 && hour < 16.5) return 1.1; // Afternoon
  if (hour >= 19 && hour < 21) return 0.7; // Late evening
  return 0.3; // Night / Early morning
};

/**
 * Generate synthetic training dataset for ML ETA Refinement
 * Target: adjustmentMinutes (ML adjustment to add to deterministic base ETA)
 */
export const generateETADataset = (numSamples = 3000, seed = 101) => {
  const rng = new SeededRandom(seed);
  const X = [];
  const y = [];
  const records = [];

  for (let i = 0; i < numSamples; i++) {
    const hour = rng.range(7, 21); // 7 AM to 9 PM
    const dayOfWeek = Math.floor(rng.range(1, 8)); // 1=Mon .. 7=Sun
    const isWeekend = dayOfWeek >= 6 ? 1 : 0;
    const distanceKm = rng.range(0.2, 4.5);
    const speed = rng.range(10, 32); // km/h
    const stopSequence = Math.floor(rng.range(1, 7));
    const totalStops = 6;
    const isDelayedStatus = rng.next() < 0.12 ? 1 : 0; // 12% chance of delayed flag
    const weatherCondition = rng.choice(['clear', 'clear', 'clear', 'rain', 'fog']);
    const weatherDelay = weatherCondition === 'rain' ? 2.5 : weatherCondition === 'fog' ? 1.5 : 0;
    const rush = getRushMultiplier(hour) * (isWeekend ? 0.6 : 1.0);
    const isRushHour = rush > 1.3 ? 1 : 0;

    // Feature vector:
    // [distanceKm, speed, hour, dayOfWeek, isWeekend, stopSequence, totalStops, isDelayedStatus, weatherDelay, isRushHour]
    const features = [
      parseFloat(distanceKm.toFixed(2)),
      parseFloat(speed.toFixed(1)),
      parseFloat(hour.toFixed(1)),
      dayOfWeek,
      isWeekend,
      stopSequence,
      totalStops,
      isDelayedStatus,
      weatherDelay,
      isRushHour,
    ];

    // Compute realistic ground truth delay adjustment in minutes:
    // Baseline deterministic speed is ~20km/h with ~0.75m dwell per stop.
    // Systematic adjustments arise from:
    // 1. Rush hour pedestrian boarding congestion: +(0.8 to 2.5 min)
    // 2. Weather factor: +(0 to 2.5 min)
    // 3. Delayed bus status cascading delay: +(1.5 to 4.0 min)
    // 4. Low speed (<15 km/h) crawling: +(0.5 to 2.0 min)
    // 5. Late evening free roads: -(0.5 to 1.5 min)
    let trueAdjustment = 0;

    if (isRushHour) {
      trueAdjustment += (stopSequence * 0.35) + (rush * 0.8);
    }
    if (weatherDelay > 0) {
      trueAdjustment += weatherDelay * (distanceKm / 2.0);
    }
    if (isDelayedStatus) {
      trueAdjustment += 2.8 + rng.gaussian(0, 0.5);
    }
    if (speed < 15) {
      trueAdjustment += (15 - speed) * 0.12;
    }
    if (hour > 19 || isWeekend) {
      trueAdjustment -= 0.6; // Faster campus roads with zero pedestrian friction
    }

    // Add slight realistic Gaussian noise (mean 0, stdev 0.4 min)
    trueAdjustment += rng.gaussian(0, 0.35);

    // Round adjustment to 2 decimals
    const adjustmentMinutes = parseFloat(trueAdjustment.toFixed(2));

    X.push(features);
    y.push(adjustmentMinutes);

    records.push({
      distanceKm: features[0],
      speedKmH: features[1],
      hour: features[2],
      dayOfWeek: features[3],
      isWeekend: features[4],
      stopSequence: features[5],
      totalStops: features[6],
      isDelayedStatus: features[7],
      weatherDelay: features[8],
      isRushHour: features[9],
      adjustmentMinutes,
    });
  }

  return {
    metadata: { ...DATASET_METADATA, target: 'ETA Delay Adjustment Minutes', numSamples },
    featureNames: [
      'distanceKm',
      'speedKmH',
      'hourOfDay',
      'dayOfWeek',
      'isWeekend',
      'stopSequence',
      'totalStops',
      'isDelayedStatus',
      'weatherDelayFactor',
      'isRushHour',
    ],
    X,
    y,
    records,
  };
};

/**
 * Generate synthetic training dataset for Passenger Crowd / Occupancy Estimation
 * Target: occupancyRatio (0.05 to 1.0)
 */
export const generateCrowdDataset = (numSamples = 3000, seed = 202) => {
  const rng = new SeededRandom(seed);
  const X = [];
  const y = [];
  const records = [];

  for (let i = 0; i < numSamples; i++) {
    const hour = rng.range(7, 21);
    const dayOfWeek = Math.floor(rng.range(1, 8));
    const isWeekend = dayOfWeek >= 6 ? 1 : 0;
    const routeIndex = Math.floor(rng.range(1, 4)); // 1=R-101, 2=R-102, 3=R-103
    const stopSequence = Math.floor(rng.range(1, 7));
    const totalStops = 6;
    const baseCapacity = routeIndex === 1 ? 45 : routeIndex === 2 ? 35 : 50;
    const rush = getRushMultiplier(hour) * (isWeekend ? 0.5 : 1.0);
    const isRushHour = rush > 1.3 ? 1 : 0;

    // Feature vector:
    // [hour, dayOfWeek, isWeekend, routeIndex, stopSequence, totalStops, isRushHour, baseCapacity]
    const features = [
      parseFloat(hour.toFixed(1)),
      dayOfWeek,
      isWeekend,
      routeIndex,
      stopSequence,
      totalStops,
      isRushHour,
      baseCapacity,
    ];

    // Compute realistic ground truth occupancy ratio
    // R-101 and R-102 fill up quickly in stops 1-3, peak at stops 3-5, taper at stop 6
    let baseRatio = 0.25;

    if (rush >= 1.7) {
      baseRatio = 0.75; // Peak rush: 70-95% full
    } else if (rush >= 1.3) {
      baseRatio = 0.55; // Lunch rush: 50-70% full
    } else if (rush >= 1.0) {
      baseRatio = 0.35; // Standard operating
    } else {
      baseRatio = 0.15; // Low demand
    }

    if (isWeekend) baseRatio *= 0.6;
    if (routeIndex === 1) baseRatio += 0.08; // R-101 is high demand express
    if (stopSequence >= 2 && stopSequence <= 4) baseRatio += 0.12; // Middle campus stops have peak on-board load

    // Add slight random deviation
    baseRatio += rng.gaussian(0, 0.06);
    const occupancyRatio = Math.max(0.05, Math.min(1.0, parseFloat(baseRatio.toFixed(3))));
    const estimatedPassengers = Math.round(occupancyRatio * baseCapacity);

    let crowdLevel = 'LOW';
    if (occupancyRatio >= 0.9) crowdLevel = 'FULL';
    else if (occupancyRatio >= 0.7) crowdLevel = 'HIGH';
    else if (occupancyRatio >= 0.4) crowdLevel = 'MODERATE';

    X.push(features);
    y.push(occupancyRatio);

    records.push({
      hour: features[0],
      dayOfWeek: features[1],
      isWeekend: features[2],
      routeIndex: features[3],
      stopSequence: features[4],
      totalStops: features[5],
      isRushHour: features[6],
      baseCapacity: features[7],
      occupancyRatio,
      estimatedPassengers,
      crowdLevel,
    });
  }

  return {
    metadata: { ...DATASET_METADATA, target: 'Bus Occupancy Ratio (0.0 - 1.0)', numSamples },
    featureNames: [
      'hourOfDay',
      'dayOfWeek',
      'isWeekend',
      'routeIndex',
      'stopSequence',
      'totalStops',
      'isRushHour',
      'baseCapacity',
    ],
    X,
    y,
    records,
  };
};

/**
 * Generate synthetic training dataset for Campus Transport Demand Forecasting
 * Target: hourlyDemandCount (expected passenger boardings per hour)
 */
export const generateDemandDataset = (numSamples = 3000, seed = 303) => {
  const rng = new SeededRandom(seed);
  const X = [];
  const y = [];
  const records = [];

  for (let i = 0; i < numSamples; i++) {
    const hour = Math.floor(rng.range(6, 22)); // 6 AM to 10 PM
    const dayOfWeek = Math.floor(rng.range(1, 8));
    const isWeekend = dayOfWeek >= 6 ? 1 : 0;
    const routeIndex = Math.floor(rng.range(1, 4));
    const rush = getRushMultiplier(hour) * (isWeekend ? 0.45 : 1.0);
    const isRushHour = rush > 1.3 ? 1 : 0;

    // Feature vector: [hour, dayOfWeek, isWeekend, routeIndex, isRushHour]
    const features = [hour, dayOfWeek, isWeekend, routeIndex, isRushHour];

    // Compute expected hourly demand:
    // Morning peak (8-10 AM): 120-190 pax/hour
    // Lunch peak (12-2 PM): 80-130 pax/hour
    // Evening peak (4:30-7 PM): 110-175 pax/hour
    // Off-peak: 30-65 pax/hour
    // Late night / weekend: 10-35 pax/hour
    let meanDemand = 40;

    if (rush >= 1.7) {
      meanDemand = routeIndex === 1 ? 165 : routeIndex === 2 ? 140 : 125;
    } else if (rush >= 1.3) {
      meanDemand = routeIndex === 1 ? 115 : routeIndex === 2 ? 95 : 85;
    } else if (rush >= 1.0) {
      meanDemand = routeIndex === 1 ? 65 : routeIndex === 2 ? 50 : 45;
    } else {
      meanDemand = 22;
    }

    if (isWeekend) meanDemand *= 0.45;

    const noise = rng.gaussian(0, 8);
    const hourlyDemandCount = Math.max(5, Math.round(meanDemand + noise));

    let demandCategory = 'LOW';
    if (hourlyDemandCount >= 140) demandCategory = 'SURGE';
    else if (hourlyDemandCount >= 90) demandCategory = 'HIGH';
    else if (hourlyDemandCount >= 50) demandCategory = 'MODERATE';

    X.push(features);
    y.push(hourlyDemandCount);

    records.push({
      hour: features[0],
      dayOfWeek: features[1],
      isWeekend: features[2],
      routeIndex: features[3],
      isRushHour: features[4],
      hourlyDemandCount,
      demandCategory,
    });
  }

  return {
    metadata: { ...DATASET_METADATA, target: 'Hourly Passenger Demand Count', numSamples },
    featureNames: ['hourOfDay', 'dayOfWeek', 'isWeekend', 'routeIndex', 'isRushHour'],
    X,
    y,
    records,
  };
};
