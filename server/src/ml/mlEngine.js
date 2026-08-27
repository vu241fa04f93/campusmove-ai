/**
 * CampusMove AI — Native Machine Learning Engine
 * 
 * Provides mathematical ML models, feature standardizers, decision tree ensembles,
 * and evaluation metrics running purely in native Node.js (ESM).
 */

// ============================================================================
// 1. LINEAR ALGEBRA HELPERS
// ============================================================================

/**
 * Transpose a 2D matrix
 */
export const transpose = (matrix) => {
  if (!matrix || matrix.length === 0) return [];
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][r] = matrix[r][c];
    }
  }
  return result;
};

/**
 * Multiply two 2D matrices A (m x k) and B (k x n) -> (m x n)
 */
export const matrixMultiply = (A, B) => {
  const rowsA = A.length;
  const colsA = A[0].length;
  const rowsB = B.length;
  const colsB = B[0].length;

  if (colsA !== rowsB) {
    throw new Error(`Matrix multiplication dimension mismatch: ${colsA} !== ${rowsB}`);
  }

  const result = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
  for (let i = 0; i < rowsA; i++) {
    for (let k = 0; k < colsA; k++) {
      const aik = A[i][k];
      for (let j = 0; j < colsB; j++) {
        result[i][j] += aik * B[k][j];
      }
    }
  }
  return result;
};

/**
 * Invert a square matrix using Gauss-Jordan elimination with partial pivoting
 */
export const matrixInverse = (matrix) => {
  const n = matrix.length;
  // Augment with identity matrix
  const A = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    if (maxRow !== i) {
      [A[i], A[maxRow]] = [A[maxRow], A[i]];
    }

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-12) {
      // Add slight diagonal regularization for non-invertible matrix
      A[i][i] += 1e-6;
    }

    const currentPivot = A[i][i];
    for (let j = 0; j < 2 * n; j++) {
      A[i][j] /= currentPivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = 0; j < 2 * n; j++) {
          A[k][j] -= factor * A[i][j];
        }
      }
    }
  }

  // Extract right half
  return A.map((row) => row.slice(n));
};

// ============================================================================
// 2. FEATURE STANDARDIZATION
// ============================================================================

export class StandardScaler {
  constructor() {
    this.mean = [];
    this.std = [];
    this.isFitted = false;
  }

  fit(X) {
    if (!X || X.length === 0) return this;
    const numFeatures = X[0].length;
    const numSamples = X.length;

    this.mean = Array(numFeatures).fill(0);
    this.std = Array(numFeatures).fill(0);

    for (let i = 0; i < numSamples; i++) {
      for (let j = 0; j < numFeatures; j++) {
        this.mean[j] += X[i][j];
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      this.mean[j] /= numSamples;
    }

    for (let i = 0; i < numSamples; i++) {
      for (let j = 0; j < numFeatures; j++) {
        const diff = X[i][j] - this.mean[j];
        this.std[j] += diff * diff;
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      this.std[j] = Math.sqrt(this.std[j] / numSamples);
      if (this.std[j] < 1e-7) {
        this.std[j] = 1.0; // Avoid divide by zero
      }
    }

    this.isFitted = true;
    return this;
  }

  transform(X) {
    if (!this.isFitted) throw new Error('StandardScaler must be fitted before transform');
    return X.map((row) =>
      row.map((val, j) => (val - this.mean[j]) / this.std[j])
    );
  }

  fitTransform(X) {
    return this.fit(X).transform(X);
  }

  transformVector(vec) {
    if (!this.isFitted) throw new Error('StandardScaler must be fitted before transform');
    return vec.map((val, j) => (val - (this.mean[j] || 0)) / (this.std[j] || 1));
  }

  toJSON() {
    return { mean: this.mean, std: this.std, isFitted: this.isFitted };
  }

  static fromJSON(json) {
    const scaler = new StandardScaler();
    scaler.mean = json.mean || [];
    scaler.std = json.std || [];
    scaler.isFitted = !!json.isFitted;
    return scaler;
  }
}

// ============================================================================
// 3. RIDGE REGRESSOR (Linear Regression with L2 Regularization)
// ============================================================================

export class RidgeRegressor {
  constructor(options = {}) {
    this.alpha = options.alpha !== undefined ? options.alpha : 1.0;
    this.fitIntercept = options.fitIntercept !== undefined ? options.fitIntercept : true;
    this.weights = [];
    this.intercept = 0;
    this.scaler = new StandardScaler();
    this.featureNames = options.featureNames || [];
    this.isTrained = false;
  }

  fit(X, y) {
    if (!X || X.length === 0 || !y || y.length === 0) {
      throw new Error('X and y must not be empty');
    }

    const scaledX = this.scaler.fitTransform(X);
    const n = scaledX.length;
    const p = scaledX[0].length;

    // Center y
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const centeredY = y.map((val) => [val - (this.fitIntercept ? yMean : 0)]);

    // Ridge Normal Equation: (X^T * X + alpha * I)^(-1) * X^T * y
    const Xt = transpose(scaledX);
    const XtX = matrixMultiply(Xt, scaledX);

    // Add L2 penalty (alpha * I) to diagonal
    for (let i = 0; i < p; i++) {
      XtX[i][i] += this.alpha;
    }

    const XtX_inv = matrixInverse(XtX);
    const XtY = matrixMultiply(Xt, centeredY);
    const beta = matrixMultiply(XtX_inv, XtY);

    this.weights = beta.map((row) => row[0]);
    this.intercept = this.fitIntercept ? yMean : 0;
    this.isTrained = true;
    return this;
  }

  predictVector(x) {
    if (!this.isTrained) throw new Error('Model is not trained');
    const scaledX = this.scaler.transformVector(x);
    let pred = this.intercept;
    for (let j = 0; j < this.weights.length; j++) {
      pred += scaledX[j] * this.weights[j];
    }
    return pred;
  }

  predict(X) {
    if (!this.isTrained) throw new Error('Model is not trained');
    return X.map((row) => this.predictVector(row));
  }

  toJSON() {
    return {
      type: 'RidgeRegressor',
      alpha: this.alpha,
      fitIntercept: this.fitIntercept,
      weights: this.weights,
      intercept: this.intercept,
      scaler: this.scaler.toJSON(),
      featureNames: this.featureNames,
      isTrained: this.isTrained,
    };
  }

  static fromJSON(json) {
    const model = new RidgeRegressor({
      alpha: json.alpha,
      fitIntercept: json.fitIntercept,
      featureNames: json.featureNames,
    });
    model.weights = json.weights || [];
    model.intercept = json.intercept || 0;
    model.scaler = StandardScaler.fromJSON(json.scaler);
    model.isTrained = !!json.isTrained;
    return model;
  }
}

// ============================================================================
// 4. DECISION TREE REGRESSOR
// ============================================================================

class TreeNode {
  constructor() {
    this.isLeaf = false;
    this.value = null;
    this.featureIndex = null;
    this.threshold = null;
    this.left = null;
    this.right = null;
    this.samples = 0;
  }
}

export class DecisionTreeRegressor {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 6;
    this.minSamplesSplit = options.minSamplesSplit || 5;
    this.root = null;
    this.isTrained = false;
  }

  fit(X, y) {
    this.root = this._buildTree(X, y, 0);
    this.isTrained = true;
    return this;
  }

  _variance(y) {
    if (y.length === 0) return 0;
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    return y.reduce((sum, val) => sum + (val - mean) ** 2, 0) / y.length;
  }

  _buildTree(X, y, depth) {
    const node = new TreeNode();
    node.samples = y.length;

    const meanVal = y.length > 0 ? y.reduce((a, b) => a + b, 0) / y.length : 0;

    if (depth >= this.maxDepth || y.length <= this.minSamplesSplit) {
      node.isLeaf = true;
      node.value = meanVal;
      return node;
    }

    const currentVar = this._variance(y);
    if (currentVar < 1e-5) {
      node.isLeaf = true;
      node.value = meanVal;
      return node;
    }

    const numFeatures = X[0].length;
    let bestGain = -Infinity;
    let bestFeature = null;
    let bestThreshold = null;
    let bestLeftIndices = null;
    let bestRightIndices = null;

    for (let f = 0; f < numFeatures; f++) {
      const values = X.map((row) => row[f]);
      const uniqueVals = Array.from(new Set(values)).sort((a, b) => a - b);

      for (let i = 0; i < uniqueVals.length - 1; i++) {
        const threshold = (uniqueVals[i] + uniqueVals[i + 1]) / 2;
        const leftIdx = [];
        const rightIdx = [];

        for (let k = 0; k < X.length; k++) {
          if (X[k][f] <= threshold) leftIdx.push(k);
          else rightIdx.push(k);
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftY = leftIdx.map((idx) => y[idx]);
        const rightY = rightIdx.map((idx) => y[idx]);

        const gain =
          currentVar -
          (leftY.length / y.length) * this._variance(leftY) -
          (rightY.length / y.length) * this._variance(rightY);

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestGain <= 0 || !bestLeftIndices) {
      node.isLeaf = true;
      node.value = meanVal;
      return node;
    }

    node.featureIndex = bestFeature;
    node.threshold = bestThreshold;
    node.left = this._buildTree(
      bestLeftIndices.map((i) => X[i]),
      bestLeftIndices.map((i) => y[i]),
      depth + 1
    );
    node.right = this._buildTree(
      bestRightIndices.map((i) => X[i]),
      bestRightIndices.map((i) => y[i]),
      depth + 1
    );

    return node;
  }

  predictVector(x, node = this.root) {
    if (!node || node.isLeaf) {
      return node ? node.value : 0;
    }
    if (x[node.featureIndex] <= node.threshold) {
      return this.predictVector(x, node.left);
    }
    return this.predictVector(x, node.right);
  }

  predict(X) {
    return X.map((row) => this.predictVector(row));
  }

  toJSON() {
    return {
      type: 'DecisionTreeRegressor',
      maxDepth: this.maxDepth,
      minSamplesSplit: this.minSamplesSplit,
      root: this.root,
      isTrained: this.isTrained,
    };
  }

  static fromJSON(json) {
    const tree = new DecisionTreeRegressor({
      maxDepth: json.maxDepth,
      minSamplesSplit: json.minSamplesSplit,
    });
    tree.root = json.root;
    tree.isTrained = !!json.isTrained;
    return tree;
  }
}

// ============================================================================
// 5. RANDOM FOREST REGRESSOR
// ============================================================================

export class RandomForestRegressor {
  constructor(options = {}) {
    this.nEstimators = options.nEstimators || 8;
    this.maxDepth = options.maxDepth || 6;
    this.minSamplesSplit = options.minSamplesSplit || 4;
    this.trees = [];
    this.isTrained = false;
  }

  fit(X, y) {
    const n = X.length;
    this.trees = [];

    for (let t = 0; t < this.nEstimators; t++) {
      // Bootstrap sample
      const sampleX = [];
      const sampleY = [];
      for (let i = 0; i < n; i++) {
        const randIdx = Math.floor(Math.random() * n);
        sampleX.push(X[randIdx]);
        sampleY.push(y[randIdx]);
      }

      const tree = new DecisionTreeRegressor({
        maxDepth: this.maxDepth,
        minSamplesSplit: this.minSamplesSplit,
      });
      tree.fit(sampleX, sampleY);
      this.trees.push(tree);
    }

    this.isTrained = true;
    return this;
  }

  predictVector(x) {
    if (!this.isTrained) throw new Error('RandomForest is not trained');
    const predictions = this.trees.map((tree) => tree.predictVector(x));
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    return mean;
  }

  predict(X) {
    return X.map((row) => this.predictVector(row));
  }

  toJSON() {
    return {
      type: 'RandomForestRegressor',
      nEstimators: this.nEstimators,
      maxDepth: this.maxDepth,
      minSamplesSplit: this.minSamplesSplit,
      trees: this.trees.map((t) => t.toJSON()),
      isTrained: this.isTrained,
    };
  }

  static fromJSON(json) {
    const forest = new RandomForestRegressor({
      nEstimators: json.nEstimators,
      maxDepth: json.maxDepth,
      minSamplesSplit: json.minSamplesSplit,
    });
    forest.trees = (json.trees || []).map((t) => DecisionTreeRegressor.fromJSON(t));
    forest.isTrained = !!json.isTrained;
    return forest;
  }
}

// ============================================================================
// 6. CROWD ESTIMATOR / CLASSIFIER
// ============================================================================

export class CrowdEstimator {
  constructor(options = {}) {
    this.regressor = new RidgeRegressor({ alpha: 0.5, fitIntercept: true });
    this.isTrained = false;
  }

  fit(X, yOccupancyRatio) {
    this.regressor.fit(X, yOccupancyRatio);
    this.isTrained = true;
    return this;
  }

  /**
   * Predict occupancy ratio (0.0 to 1.0) and map to category
   */
  predictOccupancy(x) {
    const rawRatio = this.regressor.predictVector(x);
    // Clamp between 0.05 and 1.0
    const ratio = Math.max(0.05, Math.min(1.0, rawRatio));
    const percentage = Math.round(ratio * 100);

    let crowdLevel = 'LOW';
    if (percentage >= 90) crowdLevel = 'FULL';
    else if (percentage >= 70) crowdLevel = 'HIGH';
    else if (percentage >= 40) crowdLevel = 'MODERATE';
    else crowdLevel = 'LOW';

    // Confidence is higher towards mean and bounds
    const confidence = Math.round(85 + Math.min(12, (1 - Math.abs(ratio - 0.5)) * 10));

    return {
      occupancyRatio: ratio,
      occupancyPercentage: percentage,
      crowdLevel,
      confidence,
    };
  }

  toJSON() {
    return {
      type: 'CrowdEstimator',
      regressor: this.regressor.toJSON(),
      isTrained: this.isTrained,
    };
  }

  static fromJSON(json) {
    const estimator = new CrowdEstimator();
    estimator.regressor = RidgeRegressor.fromJSON(json.regressor);
    estimator.isTrained = !!json.isTrained;
    return estimator;
  }
}

// ============================================================================
// 7. EVALUATION METRICS
// ============================================================================

export const evaluateRegression = (yTrue, yPred) => {
  if (!yTrue || !yPred || yTrue.length === 0 || yTrue.length !== yPred.length) {
    return { mae: 0, rmse: 0, r2: 0 };
  }

  const n = yTrue.length;
  let sumAbsErr = 0;
  let sumSqErr = 0;
  let sumTrue = 0;

  for (let i = 0; i < n; i++) {
    const diff = yPred[i] - yTrue[i];
    sumAbsErr += Math.abs(diff);
    sumSqErr += diff * diff;
    sumTrue += yTrue[i];
  }

  const mae = sumAbsErr / n;
  const rmse = Math.sqrt(sumSqErr / n);
  const yMean = sumTrue / n;

  let totalVar = 0;
  for (let i = 0; i < n; i++) {
    totalVar += (yTrue[i] - yMean) ** 2;
  }

  const r2 = totalVar > 0 ? 1 - sumSqErr / totalVar : 1.0;

  return {
    mae: parseFloat(mae.toFixed(3)),
    rmse: parseFloat(rmse.toFixed(3)),
    r2: parseFloat(r2.toFixed(3)),
    sampleCount: n,
  };
};

export const evaluateClassification = (yTrue, yPred) => {
  if (!yTrue || !yPred || yTrue.length === 0) return { accuracy: 0 };
  let correct = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === yPred[i]) correct++;
  }
  return {
    accuracy: parseFloat((correct / yTrue.length).toFixed(3)),
    sampleCount: yTrue.length,
  };
};
