import { formatDate, formatDateTime, formatTime } from './dateUtils';

// Currency formatting
export const formatCurrency = (amount, currency = 'IDR') => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

// Number formatting
export const formatNumber = (number, decimals = 0) => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

// Percentage formatting
export const formatPercentage = (value, decimals = 1) => {
  return `${value.toFixed(decimals)}%`;
};

// File size formatting
export const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Phone number formatting
export const formatPhoneNumber = phone => {
  if (!phone) return '';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format Indonesian phone number
  if (cleaned.startsWith('62')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)}-${cleaned.slice(
      5,
      8
    )}-${cleaned.slice(8)}`;
  } else if (cleaned.startsWith('0')) {
    return `+62 ${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(
      7
    )}`;
  }

  return phone;
};

// Time formatting (using dayjs)
export { formatDate, formatDateTime, formatTime };

// Relative time formatting
export const formatRelativeTime = date => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) {
    return 'Baru saja';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} menit yang lalu`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} jam yang lalu`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} hari yang lalu`;
  }
};

// Status formatting
export const formatStatus = status => {
  const statusMap = {
    pending: 'Menunggu',
    processing: 'Diproses',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    draft: 'Draft',
    published: 'Diterbitkan',
  };

  return statusMap[status] || status;
};

// Truncate text
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Format duration in seconds to human readable
export const formatDuration = seconds => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}j ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};
