// List all available USB printers
// Run this to find your printer's VID and PID

const USB = require('escpos-usb');

console.log('🔍 Scanning for USB printers...\n');

try {
  const devices = USB.findPrinter();
  
  if (devices.length === 0) {
    console.log('❌ No USB printers found');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your printer is connected via USB');
    console.log('2. Make sure printer is powered on');
    console.log('3. Try unplugging and plugging the USB cable again');
    console.log('4. Check if printer drivers are installed');
    process.exit(1);
  }

  console.log(`✅ Found ${devices.length} printer(s):\n`);

  devices.forEach((device, index) => {
    console.log(`Printer #${index + 1}:`);
    console.log(`  VID (Vendor ID):  ${device.deviceDescriptor.idVendor} (0x${device.deviceDescriptor.idVendor.toString(16)})`);
    console.log(`  PID (Product ID): ${device.deviceDescriptor.idProduct} (0x${device.deviceDescriptor.idProduct.toString(16)})`);
    
    if (device.deviceDescriptor.iManufacturer) {
      console.log(`  Manufacturer: ${device.deviceDescriptor.iManufacturer}`);
    }
    if (device.deviceDescriptor.iProduct) {
      console.log(`  Product: ${device.deviceDescriptor.iProduct}`);
    }
    console.log('');
  });

  console.log('📝 To use a specific printer, add to .env file:');
  console.log(`PRINTER_VID=${devices[0].deviceDescriptor.idVendor}`);
  console.log(`PRINTER_PID=${devices[0].deviceDescriptor.idProduct}`);
  console.log('\nOr leave empty to auto-detect the first available printer.');

} catch (error) {
  console.error('❌ Error scanning for printers:', error.message);
  console.log('\nMake sure you have the necessary permissions to access USB devices.');
  process.exit(1);
}
