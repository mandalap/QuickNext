/**
 * Format remaining time in a user-friendly way
 * @param {number} daysRemaining - Number of days remaining (can be decimal)
 * @returns {string} Formatted time string
 */
export const formatRemainingTime = daysRemaining => {
  if (!daysRemaining || daysRemaining <= 0) {
    return 'Tidak ada waktu tersisa';
  }

  // Round to 1 decimal place for calculations
  const roundedDays = Math.round(daysRemaining * 10) / 10;

  // If less than 1 day, show hours
  if (roundedDays < 1) {
    const hours = Math.round(daysRemaining * 24);
    if (hours <= 0) {
      return 'Kurang dari 1 jam tersisa';
    }
    return `${hours} jam tersisa`;
  }

  // If less than 7 days, show with 1 decimal for precision
  if (roundedDays < 7) {
    return `${roundedDays} hari tersisa`;
  }

  // If 7 days or more, round to whole number
  return `${Math.round(daysRemaining)} hari tersisa`;
};

/**
 * Format remaining time for trial subscriptions
 * @param {string|Date} trialEndsAt - Trial end date
 * @returns {string} Formatted trial time string
 */
export const formatTrialRemainingTime = trialEndsAt => {
  if (!trialEndsAt) {
    return 'Trial tidak aktif';
  }

  const now = new Date();
  const endDate = new Date(trialEndsAt);
  const daysRemaining = (endDate - now) / (1000 * 60 * 60 * 24);

  if (daysRemaining <= 0) {
    return 'Trial telah berakhir';
  }

  return formatRemainingTime(daysRemaining);
};

/**
 * Format subscription duration
 * @param {number} days - Number of days
 * @returns {string} Formatted duration string
 */
export const formatDuration = days => {
  if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours} jam`;
  }

  if (days < 7) {
    const roundedDays = Math.round(days * 10) / 10;
    return `${roundedDays} hari`;
  }

  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} minggu`;
  }

  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} bulan`;
  }

  const years = Math.round(days / 365);
  return `${years} tahun`;
};

/**
 * Get time status color class
 * @param {number} daysRemaining - Number of days remaining
 * @returns {string} CSS class for color
 */
export const getTimeStatusColor = daysRemaining => {
  if (daysRemaining <= 0) {
    return 'text-red-600';
  }

  if (daysRemaining < 1) {
    return 'text-orange-600';
  }

  if (daysRemaining < 3) {
    return 'text-yellow-600';
  }

  if (daysRemaining < 7) {
    return 'text-blue-600';
  }

  return 'text-green-600';
};












































































