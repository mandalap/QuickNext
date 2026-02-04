// Uninstall QuickKasir Print Server Windows Service

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object (same config as install)
const svc = new Service({
  name: 'QuickKasir Print Server',
  script: path.join(__dirname, 'server.js')
});

// Listen for the "uninstall" event
svc.on('uninstall', function() {
  console.log('✅ QuickKasir Print Server uninstalled successfully!');
  console.log('The service has been removed from Windows Services.');
});

// Listen for errors
svc.on('error', function(err) {
  console.error('❌ Uninstall error:', err);
});

// Uninstall the service
console.log('🗑️  Uninstalling QuickKasir Print Server...');
console.log('');
console.log('⚠️  This requires administrator privileges.');
console.log('If prompted, please allow the uninstallation.');
console.log('');

svc.uninstall();
