/**
 * Script untuk generate PWA icons dari source image
 * 
 * Usage:
 *   node scripts/generate-icons.js
 * 
 * Requirements:
 *   npm install sharp --save-dev
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 64, 72, 96, 144, 180, 192, 512];
const sourceImage = path.join(__dirname, '..', 'public', 'logo-qk.png');
const outputDir = path.join(__dirname, '..', 'public');

// Check if source image exists
const fullImagePath = path.join(__dirname, '..', 'public', 'logi-qk-full.png');
if (!fs.existsSync(sourceImage) && !fs.existsSync(fullImagePath)) {
  console.error('❌ Source image not found!');
  console.error('   Please ensure logo-qk.png or logi-qk-full.png exists in public/ folder');
  process.exit(1);
}

// Use the best available source
const actualSource = fs.existsSync(sourceImage) 
  ? sourceImage 
  : fullImagePath;

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');
  console.log(`📁 Source: ${path.basename(actualSource)}`);
  console.log(`📁 Output: ${outputDir}\n`);

  try {
    // Generate PNG icons
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(actualSource)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated icon-${size}x${size}.png`);
    }

    // Generate Apple Touch Icon (180x180)
    const appleTouchIcon = path.join(outputDir, 'apple-touch-icon.png');
    await sharp(actualSource)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(appleTouchIcon);
    console.log(`✅ Generated apple-touch-icon.png`);

    console.log('\n✅ All icons generated successfully!');
    console.log('\n⚠️  Note: favicon.ico requires special format.');
    console.log('   Please use https://realfavicongenerator.net/ to generate favicon.ico');
    console.log('\n📝 Next steps:');
    console.log('   1. Update manifest.json with new icons');
    console.log('   2. Update index.html with icon links');
    console.log('   3. Generate favicon.ico using online tool');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

