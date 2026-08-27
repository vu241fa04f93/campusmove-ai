import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  RidgeRegressor,
  CrowdEstimator,
  RandomForestRegressor,
  DecisionTreeRegressor,
  evaluateRegression,
  evaluateClassification,
} from './mlEngine.js';
import {
  generateETADataset,
  generateCrowdDataset,
  generateDemandDataset,
} from './datasetGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_DIR = path.join(__dirname, 'models');

/**
 * Split dataset into train and test partitions (e.g. 80% train, 20% test)
 */
export const trainTestSplit = (X, y, testSize = 0.2, seed = 42) => {
  const n = X.length;
  const numTest = Math.floor(n * testSize);
  const indices = Array.from({ length: n }, (_, i) => i);

  // Deterministic shuffle
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const testIndices = new Set(indices.slice(0, numTest));
  const XTrain = [];
  const yTrain = [];
  const XTest = [];
  const yTest = [];

  for (let i = 0; i < n; i++) {
    if (testIndices.has(i)) {
      XTest.push(X[i]);
      yTest.push(y[i]);
    } else {
      XTrain.push(X[i]);
      yTrain.push(y[i]);
    }
  }

  return { XTrain, yTrain, XTest, yTest };
};

/**
 * Train all prediction models and return serialized artifacts + evaluation metrics
 */
export const trainAllModels = async (saveToDisk = true) => {
  console.log('[ML Pipeline] Starting CampusMove AI Model Training Pipeline...');
  const startTime = Date.now();

  if (saveToDisk && !fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  // 1. Train ETA Adjustment Model (Ridge Regressor with L2 Regularization)
  console.log('  [1/3] Generating synthetic dataset & training ML ETA Model...');
  const etaData = generateETADataset(4000, 101);
  const {
    XTrain: etaXTrain,
    yTrain: etaYTrain,
    XTest: etaXTest,
    yTest: etaYTest,
  } = trainTestSplit(etaData.X, etaData.y, 0.2, 101);

  const etaModel = new RidgeRegressor({
    alpha: 1.0,
    fitIntercept: true,
    featureNames: etaData.featureNames,
  });
  etaModel.fit(etaXTrain, etaYTrain);

  const etaPredictions = etaModel.predict(etaXTest);
  const etaMetrics = evaluateRegression(etaYTest, etaPredictions);
  console.log(`        ETA Model Trained — MAE: ${etaMetrics.mae} mins, RMSE: ${etaMetrics.rmse} mins, R²: ${etaMetrics.r2}`);

  // 2. Train Crowd Occupancy Model (CrowdEstimator)
  console.log('  [2/3] Generating synthetic dataset & training Crowd Estimator Model...');
  const crowdData = generateCrowdDataset(4000, 202);
  const {
    XTrain: crowdXTrain,
    yTrain: crowdYTrain,
    XTest: crowdXTest,
    yTest: crowdYTest,
  } = trainTestSplit(crowdData.X, crowdData.y, 0.2, 202);

  const crowdModel = new CrowdEstimator();
  crowdModel.fit(crowdXTrain, crowdYTrain);

  const crowdOccupancyPreds = crowdXTest.map((x) => crowdModel.predictOccupancy(x).occupancyRatio);
  const crowdMetrics = evaluateRegression(crowdYTest, crowdOccupancyPreds);

  // Classification accuracy check
  const actualCategories = crowdYTest.map((r) =>
    r >= 0.9 ? 'FULL' : r >= 0.7 ? 'HIGH' : r >= 0.4 ? 'MODERATE' : 'LOW'
  );
  const predCategories = crowdXTest.map((x) => crowdModel.predictOccupancy(x).crowdLevel);
  const crowdClfMetrics = evaluateClassification(actualCategories, predCategories);

  console.log(`        Crowd Model Trained — Occupancy MAE: ${crowdMetrics.mae}, Category Accuracy: ${(crowdClfMetrics.accuracy * 100).toFixed(1)}%`);

  // 3. Train Transport Demand Model (RandomForest Ensemble Regressor)
  console.log('  [3/3] Generating synthetic dataset & training Transport Demand Forecast Model...');
  const demandData = generateDemandDataset(4000, 303);
  const {
    XTrain: demandXTrain,
    yTrain: demandYTrain,
    XTest: demandXTest,
    yTest: demandYTest,
  } = trainTestSplit(demandData.X, demandData.y, 0.2, 303);

  const demandModel = new RandomForestRegressor({
    nEstimators: 8,
    maxDepth: 6,
    minSamplesSplit: 4,
  });
  demandModel.fit(demandXTrain, demandYTrain);

  const demandPredictions = demandModel.predict(demandXTest);
  const demandMetrics = evaluateRegression(demandYTest, demandPredictions);
  console.log(`        Demand Model Trained — MAE: ${demandMetrics.mae} pax/hr, RMSE: ${demandMetrics.rmse} pax/hr, R²: ${demandMetrics.r2}`);

  const trainingReport = {
    trainedAt: new Date().toISOString(),
    trainingDurationMs: Date.now() - startTime,
    datasetSamples: {
      eta: etaData.X.length,
      crowd: crowdData.X.length,
      demand: demandData.X.length,
    },
    metrics: {
      eta: {
        modelType: 'RidgeRegressor (L2 Regularized)',
        ...etaMetrics,
      },
      crowd: {
        modelType: 'CrowdEstimator (Calibrated Linear & Quantile Classifier)',
        occupancyMae: crowdMetrics.mae,
        occupancyRmse: crowdMetrics.rmse,
        categoryAccuracy: crowdClfMetrics.accuracy,
      },
      demand: {
        modelType: 'RandomForestRegressor (8 Trees, Depth 6)',
        ...demandMetrics,
      },
    },
  };

  if (saveToDisk) {
    fs.writeFileSync(path.join(MODELS_DIR, 'eta_model.json'), JSON.stringify(etaModel.toJSON(), null, 2));
    fs.writeFileSync(path.join(MODELS_DIR, 'crowd_model.json'), JSON.stringify(crowdModel.toJSON(), null, 2));
    fs.writeFileSync(path.join(MODELS_DIR, 'demand_model.json'), JSON.stringify(demandModel.toJSON(), null, 2));
    fs.writeFileSync(path.join(MODELS_DIR, 'training_report.json'), JSON.stringify(trainingReport, null, 2));
    console.log(`✅ [ML Pipeline] All models successfully saved to: ${MODELS_DIR}\n`);
  }

  return {
    etaModel,
    crowdModel,
    demandModel,
    trainingReport,
  };
};

/**
 * Load models from persisted JSON artifacts or train fresh if not present
 */
export const loadTrainedModels = async () => {
  const etaPath = path.join(MODELS_DIR, 'eta_model.json');
  const crowdPath = path.join(MODELS_DIR, 'crowd_model.json');
  const demandPath = path.join(MODELS_DIR, 'demand_model.json');
  const reportPath = path.join(MODELS_DIR, 'training_report.json');

  if (
    fs.existsSync(etaPath) &&
    fs.existsSync(crowdPath) &&
    fs.existsSync(demandPath) &&
    fs.existsSync(reportPath)
  ) {
    try {
      const etaJSON = JSON.parse(fs.readFileSync(etaPath, 'utf8'));
      const crowdJSON = JSON.parse(fs.readFileSync(crowdPath, 'utf8'));
      const demandJSON = JSON.parse(fs.readFileSync(demandPath, 'utf8'));
      const trainingReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

      const etaModel = RidgeRegressor.fromJSON(etaJSON);
      const crowdModel = CrowdEstimator.fromJSON(crowdJSON);
      const demandModel = RandomForestRegressor.fromJSON(demandJSON);

      return {
        etaModel,
        crowdModel,
        demandModel,
        trainingReport,
      };
    } catch (err) {
      console.warn('[ML Pipeline] Failed to parse existing models. Re-training fresh...', err.message);
    }
  }

  // Train fresh and persist
  return await trainAllModels(true);
};

// If run directly via CLI
if (process.argv[1]?.endsWith('trainModels.js')) {
  (async () => {
    try {
      await trainAllModels(true);
      process.exit(0);
    } catch (err) {
      console.error('❌ Training error:', err);
      process.exit(1);
    }
  })();
}
