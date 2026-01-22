/**
 * Format currency to Indonesian Rupiah
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = amount => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format number with thousand separators
 * @param {number} number - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = number => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }

  return new Intl.NumberFormat('id-ID').format(number);
};

/**
 * Format date to Indonesian format
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = date => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
};

/**
 * Format date and time to Indonesian format
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = date => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};
