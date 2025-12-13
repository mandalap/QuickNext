<?php

/**
 * Installation script for QR Code package
 * Run this script to install the QR code package for the backend
 */

echo "Installing QR Code package for Laravel backend...\n";

// Check if composer is available
$composerPath = 'composer';
if (PHP_OS_FAMILY === 'Windows') {
    $composerPath = 'composer.bat';
}

// Install the QR code package
$command = $composerPath . ' require simplesoftwareio/simple-qrcode';
$output = [];
$returnCode = 0;

exec($command, $output, $returnCode);

if ($returnCode === 0) {
    echo "QR Code package installed successfully!\n";
    echo "You can now use QR code generation in your controllers.\n";
} else {
    echo "Error installing QR Code package. Please run manually:\n";
    echo "composer require simplesoftwareio/simple-qrcode\n";
}

echo "\nTo use QR codes in your controllers, add this import:\n";
echo "use SimpleSoftwareIO\QrCode\Facades\QrCode;\n\n";

echo "Example usage:\n";
echo "\$qrCode = QrCode::format('png')->size(300)->generate(\$url);\n";

