import {
  formatDuration,
  formatRemainingTime,
  formatTrialRemainingTime,
  getTimeStatusColor,
} from '../timeFormatter';

describe('timeFormatter', () => {
  describe('formatRemainingTime', () => {
    test('should handle zero or negative days', () => {
      expect(formatRemainingTime(0)).toBe('Tidak ada waktu tersisa');
      expect(formatRemainingTime(-1)).toBe('Tidak ada waktu tersisa');
    });

    test('should format hours for less than 1 day', () => {
      expect(formatRemainingTime(0.5)).toBe('12 jam tersisa');
      expect(formatRemainingTime(0.1)).toBe('2 jam tersisa');
      expect(formatRemainingTime(0.04)).toBe('1 jam tersisa');
    });

    test('should format days with 1 decimal for less than 7 days', () => {
      expect(formatRemainingTime(1.5)).toBe('1.5 hari tersisa');
      expect(formatRemainingTime(3.7)).toBe('3.7 hari tersisa');
      expect(formatRemainingTime(6.9)).toBe('6.9 hari tersisa');
    });

    test('should format days as whole numbers for 7+ days', () => {
      expect(formatRemainingTime(7)).toBe('7 hari tersisa');
      expect(formatRemainingTime(15.3)).toBe('15 hari tersisa');
      expect(formatRemainingTime(30.7)).toBe('31 hari tersisa');
    });

    test('should handle the specific case from user', () => {
      expect(formatRemainingTime(37.664118418599536)).toBe('38 hari tersisa');
    });
  });

  describe('formatTrialRemainingTime', () => {
    test('should handle null/undefined trial end date', () => {
      expect(formatTrialRemainingTime(null)).toBe('Trial tidak aktif');
      expect(formatTrialRemainingTime(undefined)).toBe('Trial tidak aktif');
    });

    test('should handle expired trial', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatTrialRemainingTime(yesterday.toISOString())).toBe(
        'Trial telah berakhir'
      );
    });

    test('should format active trial', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(formatTrialRemainingTime(tomorrow.toISOString())).toBe(
        '1 hari tersisa'
      );
    });
  });

  describe('formatDuration', () => {
    test('should format hours for less than 1 day', () => {
      expect(formatDuration(0.5)).toBe('12 jam');
      expect(formatDuration(0.1)).toBe('2 jam');
    });

    test('should format days for less than 7 days', () => {
      expect(formatDuration(1.5)).toBe('1.5 hari');
      expect(formatDuration(6.9)).toBe('6.9 hari');
    });

    test('should format weeks for less than 30 days', () => {
      expect(formatDuration(14)).toBe('2 minggu');
      expect(formatDuration(21)).toBe('3 minggu');
    });

    test('should format months for less than 365 days', () => {
      expect(formatDuration(60)).toBe('2 bulan');
      expect(formatDuration(180)).toBe('6 bulan');
    });

    test('should format years for 365+ days', () => {
      expect(formatDuration(365)).toBe('1 tahun');
      expect(formatDuration(730)).toBe('2 tahun');
    });
  });

  describe('getTimeStatusColor', () => {
    test('should return red for expired/zero time', () => {
      expect(getTimeStatusColor(0)).toBe('text-red-600');
      expect(getTimeStatusColor(-1)).toBe('text-red-600');
    });

    test('should return orange for less than 1 day', () => {
      expect(getTimeStatusColor(0.5)).toBe('text-orange-600');
      expect(getTimeStatusColor(0.9)).toBe('text-orange-600');
    });

    test('should return yellow for 1-3 days', () => {
      expect(getTimeStatusColor(1)).toBe('text-yellow-600');
      expect(getTimeStatusColor(2.5)).toBe('text-yellow-600');
      expect(getTimeStatusColor(3)).toBe('text-yellow-600');
    });

    test('should return blue for 3-7 days', () => {
      expect(getTimeStatusColor(3.1)).toBe('text-blue-600');
      expect(getTimeStatusColor(5)).toBe('text-blue-600');
      expect(getTimeStatusColor(7)).toBe('text-blue-600');
    });

    test('should return green for 7+ days', () => {
      expect(getTimeStatusColor(7.1)).toBe('text-green-600');
      expect(getTimeStatusColor(15)).toBe('text-green-600');
      expect(getTimeStatusColor(30)).toBe('text-green-600');
    });
  });
});












































































