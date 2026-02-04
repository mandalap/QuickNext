/**
 * Print Service - Integration with Local Print Server
 * Handles silent printing to thermal printers
 */

import axios from 'axios';

const PRINT_SERVER_URL = process.env.REACT_APP_PRINT_SERVER_URL || 'http://localhost:3001';

class PrintService {
  constructor() {
    this.isAvailable = false;
    this.checkingAvailability = false;
    this.lastCheck = null;
    this.checkInterval = 30000; // Check every 30 seconds
  }

  /**
   * Check if print server is available
   */
  async checkAvailability() {
    // Don't check too frequently
    if (this.lastCheck && Date.now() - this.lastCheck < 5000) {
      return this.isAvailable;
    }

    if (this.checkingAvailability) {
      return this.isAvailable;
    }

    this.checkingAvailability = true;
    this.lastCheck = Date.now();

    try {
      const response = await axios.get(`${PRINT_SERVER_URL}/health`, {
        timeout: 2000,
      });

      this.isAvailable = response.data.status === 'ok';
      this.checkingAvailability = false;
      return this.isAvailable;
    } catch (error) {
      this.isAvailable = false;
      this.checkingAvailability = false;
      return false;
    }
  }

  /**
   * Get printer status
   */
  async getPrinterStatus() {
    try {
      const response = await axios.get(`${PRINT_SERVER_URL}/printer/status`, {
        timeout: 2000,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Print receipt to thermal printer
   * @param {Object} receiptData - Receipt data from API
   * @returns {Promise<Object>} Print result
   */
  async printReceipt(receiptData) {
    try {
      // Check if print server is available
      const available = await this.checkAvailability();
      
      if (!available) {
        throw new Error('Print server not available');
      }

      // Send print request
      const response = await axios.post(
        `${PRINT_SERVER_URL}/print/receipt`,
        receiptData,
        {
          timeout: 10000,
        }
      );

      return {
        success: true,
        message: 'Receipt printed successfully',
        data: response.data,
      };
    } catch (error) {
      console.error('Print service error:', error);
      
      return {
        success: false,
        error: error.message,
        fallbackToBrowser: true,
      };
    }
  }

  /**
   * Test print
   */
  async testPrint() {
    try {
      const available = await this.checkAvailability();
      
      if (!available) {
        throw new Error('Print server not available');
      }

      const response = await axios.post(
        `${PRINT_SERVER_URL}/printer/test`,
        {},
        {
          timeout: 5000,
        }
      );

      return {
        success: true,
        message: 'Test print sent',
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reconnect to printer
   */
  async reconnect() {
    try {
      const response = await axios.post(
        `${PRINT_SERVER_URL}/printer/reconnect`,
        {},
        {
          timeout: 5000,
        }
      );

      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Start periodic availability check
   */
  startPeriodicCheck() {
    // Initial check
    this.checkAvailability();

    // Periodic check
    this.checkIntervalId = setInterval(() => {
      this.checkAvailability();
    }, this.checkInterval);
  }

  /**
   * Stop periodic check
   */
  stopPeriodicCheck() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }
}

// Create singleton instance
const printService = new PrintService();

export default printService;
