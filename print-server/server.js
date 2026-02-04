// QuickKasir Print Server
// Local service untuk silent printing ke thermal printer

const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
const winston = require('winston');
require('dotenv').config();

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Store printer instances
let printerDevice = null;
let printer = null;

// ============================================
// PRINTER INITIALIZATION
// ============================================

/**
 * Initialize printer connection
 * Supports USB and Network printers
 */
async function initializePrinter() {
  try {
    const printerType = process.env.PRINTER_TYPE || 'usb'; // usb, network
    
    if (printerType === 'usb') {
      // USB Printer
      const USB = require('escpos-usb');
      const devices = USB.findPrinter();
      
      if (devices.length === 0) {
        logger.warn('No USB printer found');
        return false;
      }
      
      // Use first available printer or specific VID/PID
      const vid = process.env.PRINTER_VID ? parseInt(process.env.PRINTER_VID) : null;
      const pid = process.env.PRINTER_PID ? parseInt(process.env.PRINTER_PID) : null;
      
      if (vid && pid) {
        printerDevice = new USB(vid, pid);
      } else {
        printerDevice = new USB();
      }
      
      logger.info('USB Printer initialized');
      
    } else if (printerType === 'network') {
      // Network Printer
      const Network = require('escpos-network');
      const printerIP = process.env.PRINTER_IP || '192.168.1.100';
      const printerPort = parseInt(process.env.PRINTER_PORT || '9100');
      
      printerDevice = new Network(printerIP, printerPort);
      logger.info(`Network Printer initialized: ${printerIP}:${printerPort}`);
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize printer:', error);
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get printer width based on configuration
 * 58mm = 24-32 chars (depending on font)
 * 80mm = 32-48 chars (depending on font)
 */
function getPrinterWidth() {
  const width = process.env.PRINTER_WIDTH || 'auto';
  
  if (width === 'auto') {
    // Auto-detect based on printer type
    // Default to 32 chars (80mm standard)
    return 32;
  }
  
  // Manual configuration
  const widthMap = {
    '58mm': 24,  // 58mm printer (smaller)
    '80mm': 32,  // 80mm printer (standard)
    '80mm-wide': 48  // 80mm with smaller font
  };
  
  return widthMap[width] || parseInt(width) || 32;
}

/**
 * Get divider line based on printer width
 */
function getDivider(char = '=') {
  const width = getPrinterWidth();
  return char.repeat(width);
}

/**
 * Format currency to IDR
 */
function formatCurrency(amount) {
  const number = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
}

/**
 * Center text for thermal printer
 */
function centerText(text) {
  const width = getPrinterWidth();
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Align text left and right
 */
function alignText(left, right) {
  const width = getPrinterWidth();
  const spaces = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(spaces) + right;
}

/**
 * Word wrap for long text
 */
function wrapText(text, maxWidth = null) {
  const width = maxWidth || getPrinterWidth();
  if (text.length <= width) return [text];
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    if ((currentLine + word).length <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ============================================
// PRINT FUNCTIONS
// ============================================

/**
 * Print receipt to thermal printer
 */
async function printReceipt(receiptData) {
  return new Promise((resolve, reject) => {
    try {
      if (!printerDevice) {
        throw new Error('Printer not initialized');
      }

      const {
        order = {},
        business = {},
        outlet = {},
        customer = null,
        cashier = {},
        items = [],
        payments = [],
      } = receiptData;

      // Open printer connection
      printerDevice.open(function(error) {
        if (error) {
          logger.error('Failed to open printer:', error);
          reject(error);
          return;
        }

        try {
          const printer = new escpos.Printer(printerDevice);

          // Start printing
          printer
            .font('a')
            .align('ct')
            .style('bu')
            .size(1, 1)
            .text(outlet.name || business.name || 'KASIR POS')
            .style('normal')
            .size(0, 0);

          // Outlet info
          if (outlet.address) {
            printer.text(outlet.address);
          }
          if (outlet.phone || business.phone) {
            printer.text(outlet.phone || business.phone);
          }
          if (outlet.email) {
            printer.text(outlet.email);
          }

          // Divider
          printer.text(getDivider());

          // Order info
          printer
            .align('lt')
            .text(alignText('No. Order', order.order_number || 'N/A'))
            .text(alignText('Tanggal', new Date(order.created_at || Date.now()).toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })))
            .text(alignText('Kasir', cashier.name || 'Kasir'));

          if (customer) {
            printer.text(alignText('Pelanggan', customer.name || 'Walk-in'));
          }

          printer.text(getDivider());

          // Items
          items.forEach(item => {
            const itemName = item.variant_name 
              ? `${item.product_name} (${item.variant_name})`
              : item.product_name;
            
            // Wrap long item names
            const wrappedName = wrapText(itemName);
            wrappedName.forEach(line => printer.text(line));
            
            const qtyPrice = `${item.quantity} x Rp ${formatCurrency(item.price)}`;
            const subtotal = `Rp ${formatCurrency(item.subtotal)}`;
            printer.text(alignText(qtyPrice, subtotal));

            // Item notes if any
            if (item.notes || item.note) {
              const noteText = `  Note: ${item.notes || item.note}`;
              const wrappedNote = wrapText(noteText);
              wrappedNote.forEach(line => printer.text(line));
            }
          });

          printer.text(getDivider('-'));

          // Totals
          printer
            .text(alignText('Subtotal', `Rp ${formatCurrency(order.subtotal || 0)}`));

          if (order.discount_amount > 0) {
            const discountLabel = order.coupon_code 
              ? `Diskon (${order.coupon_code})`
              : 'Diskon';
            printer.text(alignText(discountLabel, `- Rp ${formatCurrency(order.discount_amount)}`));
          }

          if (order.tax_amount > 0) {
            printer.text(alignText('Pajak', `Rp ${formatCurrency(order.tax_amount)}`));
          }

          printer
            .text(getDivider())
            .style('b')
            .size(1, 1)
            .text(alignText('TOTAL', `Rp ${formatCurrency(order.total || 0)}`))
            .size(0, 0)
            .style('normal')
            .text(getDivider());

          // Payment info
          if (payments && payments.length > 0) {
            payments.forEach(payment => {
              const methodLabels = {
                cash: 'Tunai',
                card: 'Kartu',
                transfer: 'Transfer',
                qris: 'QRIS',
                midtrans: 'Midtrans'
              };
              const method = methodLabels[payment.method] || payment.method;
              printer.text(alignText(method, `Rp ${formatCurrency(payment.amount)}`));
            });
          }

          printer.text(alignText('Dibayar', `Rp ${formatCurrency(order.paid_amount || 0)}`));

          if (order.change_amount > 0) {
            printer.text(alignText('Kembalian', `Rp ${formatCurrency(order.change_amount)}`));
          }

          // Footer
          printer
            .text(getDivider('-'))
            .align('ct')
            .text('Terima kasih atas kunjungan Anda!')
            .text('Struk ini adalah bukti pembayaran yang sah')
            .text('')
            .text(new Date().toLocaleString('id-ID'))
            .text('')
            .text('')
            .cut()
            .close();

          logger.info(`Receipt printed successfully: ${order.order_number}`);
          resolve({ success: true, message: 'Receipt printed successfully' });

        } catch (printError) {
          logger.error('Print error:', printError);
          reject(printError);
        }
      });

    } catch (error) {
      logger.error('Print receipt error:', error);
      reject(error);
    }
  });
}

/**
 * Test print - simple test receipt
 */
async function testPrint() {
  return new Promise((resolve, reject) => {
    try {
      if (!printerDevice) {
        throw new Error('Printer not initialized');
      }

      printerDevice.open(function(error) {
        if (error) {
          reject(error);
          return;
        }

        const printer = new escpos.Printer(printerDevice);
        
        const printerWidth = getPrinterWidth();
        const widthInfo = process.env.PRINTER_WIDTH || 'auto (32 chars)';
        
        printer
          .font('a')
          .align('ct')
          .style('bu')
          .size(1, 1)
          .text('TEST PRINT')
          .style('normal')
          .size(0, 0)
          .text(getDivider())
          .text('QuickKasir Print Server')
          .text('Status: Connected')
          .text('')
          .text(`Width: ${widthInfo}`)
          .text(`Chars: ${printerWidth}`)
          .text('')
          .text(new Date().toLocaleString('id-ID'))
          .text(getDivider())
          .text('')
          .text('Printer is working correctly!')
          .text('')
          .cut()
          .close();

        logger.info('Test print successful');
        resolve({ success: true, message: 'Test print successful' });
      });

    } catch (error) {
      logger.error('Test print error:', error);
      reject(error);
    }
  });
}

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'QuickKasir Print Server',
    version: '1.0.0',
    printer: printerDevice ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Get printer status
app.get('/printer/status', (req, res) => {
  res.json({
    connected: printerDevice !== null,
    type: process.env.PRINTER_TYPE || 'usb',
    timestamp: new Date().toISOString()
  });
});

// Test print
app.post('/printer/test', async (req, res) => {
  try {
    const result = await testPrint();
    res.json(result);
  } catch (error) {
    logger.error('Test print failed:', error);
    res.status(500).json({
      success: false,
      message: 'Test print failed',
      error: error.message
    });
  }
});

// Print receipt
app.post('/print/receipt', async (req, res) => {
  try {
    const receiptData = req.body;
    
    if (!receiptData) {
      return res.status(400).json({
        success: false,
        message: 'Receipt data is required'
      });
    }

    const result = await printReceipt(receiptData);
    res.json(result);

  } catch (error) {
    logger.error('Print receipt failed:', error);
    res.status(500).json({
      success: false,
      message: 'Print failed',
      error: error.message
    });
  }
});

// Reinitialize printer
app.post('/printer/reconnect', async (req, res) => {
  try {
    const success = await initializePrinter();
    res.json({
      success,
      message: success ? 'Printer reconnected' : 'Failed to reconnect printer'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Reconnection failed',
      error: error.message
    });
  }
});

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    // Initialize printer
    logger.info('Initializing printer...');
    await initializePrinter();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🖨️  QuickKasir Print Server running on port ${PORT}`);
      logger.info(`📡 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔧 Printer type: ${process.env.PRINTER_TYPE || 'usb'}`);
      logger.info('');
      logger.info('✅ Print server is ready!');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down print server...');
  if (printerDevice) {
    try {
      printerDevice.close();
    } catch (error) {
      logger.error('Error closing printer:', error);
    }
  }
  process.exit(0);
});

// Start the server
startServer();
