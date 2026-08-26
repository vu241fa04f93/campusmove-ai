/**
 * Format minutes into friendly string (e.g., "~3 mins", "< 1 min", "Arriving now")
 */
export const formatETA = (minutes) => {
  if (minutes === undefined || minutes === null) return '--';
  if (minutes <= 0) return 'Arriving now';
  if (minutes === 1) return '~1 min';
  return `~${minutes} mins`;
};

/**
 * Format distance in km or meters
 */
export const formatDistance = (km) => {
  if (km === undefined || km === null) return '--';
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

/**
 * Format speed in km/h
 */
export const formatSpeed = (speed) => {
  if (!speed || speed < 1) return '0 km/h (Stopped)';
  return `${Math.round(speed)} km/h`;
};
