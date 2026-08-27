import {
  getOverviewAnalytics,
  getPredictionAnalytics,
  getOperationalTrends,
  getPilotReadiness,
} from '../services/analytics/analyticsService.js';
import { getFleetAnalytics } from '../services/analytics/fleetAnalyticsService.js';
import { getRouteAnalytics } from '../services/analytics/routeAnalyticsService.js';
import { getComplaintAnalytics } from '../services/analytics/complaintAnalyticsService.js';
import { getIncidentAnalytics } from '../services/analytics/incidentAnalyticsService.js';

/**
 * GET /api/analytics/overview
 */
export const getOverview = async (req, res) => {
  try {
    const data = await getOverviewAnalytics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[AnalyticsController] Error in getOverview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate system overview analytics',
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/fleet
 */
export const getFleet = async (req, res) => {
  try {
    const data = await getFleetAnalytics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[AnalyticsController] Error in getFleet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate fleet utilization analytics',
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/routes
 */
export const getRoutes = async (req, res) => {
  try {
    const data = await getRouteAnalytics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[AnalyticsController] Error in getRoutes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate route analytics',
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/complaints
 */
export const getComplaints = async (req, res) => {
  try {
    const data = await getComplaintAnalytics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[AnalyticsController] Error in getComplaints:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate complaint analytics',
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/incidents
 */
export const getIncidents = async (req, res) => {
  try {
    const data = await getIncidentAnalytics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[AnalyticsController] Error in getIncidents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate incident analytics',
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/predictions
 */
export const getPredictions = async (req, res) => {
  try {
    const data = await getPredictionAnalytics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[AnalyticsController] Error in getPredictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate predictive intelligence insights',
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/trends
 */
export const getTrends = async (req, res) => {
  try {
    const range = req.query.range || '7d';
    const data = await getOperationalTrends(range);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[AnalyticsController] Error in getTrends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate operational trends',
      error: error.message,
    });
  }
};

/**
 * GET /api/analytics/pilot-readiness
 */
export const getReadiness = async (req, res) => {
  try {
    const data = await getPilotReadiness();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[AnalyticsController] Error in getReadiness:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute pilot readiness audit',
      error: error.message,
    });
  }
};
