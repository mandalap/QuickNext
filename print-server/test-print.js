// Test print functionality
// Run this to test if printer is working

const axios = require('axios');

const PRINT_SERVER_URL = process.env.PRINT_SERVER_URL || 'http://localhost:3001';

async function testPrintServer() {
  console.log('🧪 Testing QuickKasir Print Server...\n');

  try {
    // 1. Health check
    console.log('1️⃣  Checking server health...');
    const healthResponse = await axios.get(`${PRINT_SERVER_URL}/health`);
    console.log('   ✅ Server is running');
    console.log(`   Version: ${healthResponse.data.version}`);
    console.log(`   Printer: ${healthResponse.data.printer}\n`);

    // 2. Printer status
    console.log('2️⃣  Checking printer status...');
    const statusResponse = await axios.get(`${PRINT_SERVER_URL}/printer/status`);
    console.log(`   ✅ Printer connected: ${statusResponse.data.connected}`);
    console.log(`   Type: ${statusResponse.data.type}\n`);

    if (!statusResponse.data.connected) {
      console.log('   ⚠️  Printer not connected. Please check:');
      console.log('   - Printer is powered on');
      console.log('   - USB cable is connected');
      console.log('   - Printer drivers are installed\n');
      return;
    }

    // 3. Test print
    console.log('3️⃣  Sending test print...');
    const printResponse = await axios.post(`${PRINT_SERVER_URL}/printer/test`);
    
    if (printResponse.data.success) {
      console.log('   ✅ Test print sent successfully!');
      console.log('   Check your printer for output.\n');
    } else {
      console.log('   ❌ Test print failed');
      console.log(`   Error: ${printResponse.data.message}\n`);
    }

    console.log('✅ All tests completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Cannot connect to print server.');
      console.log('Make sure the print server is running:');
      console.log('   npm start\n');
    } else {
      console.log('\nError details:', error.response?.data || error.message);
    }
  }
}

// Sample receipt data for testing
async function testReceiptPrint() {
  console.log('🧪 Testing receipt print...\n');

  const sampleReceipt = {
    order: {
      order_number: 'TEST-001',
      created_at: new Date().toISOString(),
      subtotal: 50000,
      tax_amount: 5000,
      discount_amount: 5000,
      total: 50000,
      paid_amount: 50000,
      change_amount: 0,
      coupon_code: 'DISCOUNT10'
    },
    business: {
      name: 'QuickKasir Demo',
      phone: '081234567890'
    },
    outlet: {
      name: 'Outlet Pusat',
      address: 'Jl. Contoh No. 123, Jakarta',
      phone: '021-12345678',
      email: 'outlet@quickkasir.com'
    },
    customer: {
      name: 'Customer Test'
    },
    cashier: {
      name: 'Kasir 1'
    },
    items: [
      {
        product_name: 'Nasi Goreng',
        variant_name: 'Spesial',
        quantity: 2,
        price: 20000,
        subtotal: 40000,
        notes: 'Pedas sedang'
      },
      {
        product_name: 'Es Teh Manis',
        quantity: 2,
        price: 5000,
        subtotal: 10000
      }
    ],
    payments: [
      {
        method: 'cash',
        amount: 50000
      }
    ]
  };

  try {
    const response = await axios.post(`${PRINT_SERVER_URL}/print/receipt`, sampleReceipt);
    
    if (response.data.success) {
      console.log('✅ Receipt printed successfully!');
      console.log('Check your printer for the receipt.\n');
    } else {
      console.log('❌ Receipt print failed');
      console.log(`Error: ${response.data.message}\n`);
    }

  } catch (error) {
    console.error('❌ Receipt print failed:', error.message);
    console.log('\nError details:', error.response?.data || error.message);
  }
}

// Run tests
(async () => {
  await testPrintServer();
  
  // Ask if user wants to test receipt print
  console.log('Do you want to test receipt printing? (This will print a sample receipt)');
  console.log('Press Ctrl+C to skip, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  await testReceiptPrint();
})();
