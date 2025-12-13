import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(customParseFormat);

// Set default timezone
dayjs.tz.setDefault('Asia/Jakarta');

// Common date utilities
export const formatDate = (date, format = 'DD/MM/YYYY') => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date, format = 'DD/MM/YYYY HH:mm') => {
  return dayjs(date).format(format);
};

export const formatTime = (date, format = 'HH:mm') => {
  return dayjs(date).format(format);
};

export const formatRelativeTime = date => {
  return dayjs(date).fromNow();
};

export const isToday = date => {
  return dayjs(date).isSame(dayjs(), 'day');
};

export const isYesterday = date => {
  return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day');
};

export const isThisWeek = date => {
  return dayjs(date).isSame(dayjs(), 'week');
};

export const isThisMonth = date => {
  return dayjs(date).isSame(dayjs(), 'month');
};

export const isThisYear = date => {
  return dayjs(date).isSame(dayjs(), 'year');
};

export const getStartOfDay = (date = null) => {
  return dayjs(date).startOf('day').toDate();
};

export const getEndOfDay = (date = null) => {
  return dayjs(date).endOf('day').toDate();
};

export const getStartOfWeek = (date = null) => {
  return dayjs(date).startOf('week').toDate();
};

export const getEndOfWeek = (date = null) => {
  return dayjs(date).endOf('week').toDate();
};

export const getStartOfMonth = (date = null) => {
  return dayjs(date).startOf('month').toDate();
};

export const getEndOfMonth = (date = null) => {
  return dayjs(date).endOf('month').toDate();
};

export const addDays = (date, days) => {
  return dayjs(date).add(days, 'day').toDate();
};

export const subtractDays = (date, days) => {
  return dayjs(date).subtract(days, 'day').toDate();
};

export const addMonths = (date, months) => {
  return dayjs(date).add(months, 'month').toDate();
};

export const subtractMonths = (date, months) => {
  return dayjs(date).subtract(months, 'month').toDate();
};

export const getDaysDifference = (date1, date2) => {
  return dayjs(date1).diff(dayjs(date2), 'day');
};

export const getHoursDifference = (date1, date2) => {
  return dayjs(date1).diff(dayjs(date2), 'hour');
};

export const getMinutesDifference = (date1, date2) => {
  return dayjs(date1).diff(dayjs(date2), 'minute');
};

// Format duration
export const formatDuration = milliseconds => {
  return dayjs.duration(milliseconds).humanize();
};

// Parse date with timezone
export const parseDate = (date, timezone = 'Asia/Jakarta') => {
  return dayjs.tz(date, timezone);
};

// Get current date in timezone
export const now = (timezone = 'Asia/Jakarta') => {
  return dayjs.tz(timezone);
};

// Export dayjs instance for advanced usage
export { dayjs };
