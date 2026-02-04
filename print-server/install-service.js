// Install QuickKasir Print Server as Windows Service
// This allows the print server to run automatically on startup

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'QuickKasir Print Server',
  description: 'Local print server for QuickKasir POS system - handles thermal printer integration',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

// Listen for the "install" event
svc.on('install', function() {
  console.log('✅ QuickKasir Print Server installed successfully!');
  console.log('🚀 Starting service...');
  svc.start();
});

// Listen for the "start" event
svc.on('start', function() {
  console.log('✅ QuickKasir Print Server is now running!');
  console.log('');
  console.log('Service Details:');
  console.log(`  Name: ${svc.name}`);
  console.log(`  Status: Running`);
  console.log(`  Port: 3001`);
  console.log('');
  console.log('The service will automatically start when Windows boots.');
  console.log('');
  console.log('To manage the service:');
  console.log('  - Open Services (services.msc)');
  console.log('  - Find "QuickKasir Print Server"');
  console.log('  - Right-click to Stop/Start/Restart');
  console.log('');
  console.log('To uninstall the service:');
  console.log('  npm run uninstall-service');
});

// Listen for errors
svc.on('error', function(err) {
  console.error('❌ Service error:', err);
});

// Install the service
console.log('📦 Installing QuickKasir Print Server as Windows Service...');
console.log('');
console.log('⚠️  This requires administrator privileges.');
console.log('If prompted, please allow the installation.');
console.log('');

svc.install();
