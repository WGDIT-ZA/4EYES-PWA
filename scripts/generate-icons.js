const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICON_SIZES = [16, 32, 64, 192, 512];
const SOURCE_ICON = path.join(__dirname, '../src/assets/icon.png');
const PUBLIC_DIR = path.join(__dirname, '../public');

async function generateIcons() {
  // Ensure the public directory exists
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // Generate favicon.ico (multi-size)
  const faviconSizes = [16, 32, 64];
  const faviconBuffers = await Promise.all(
    faviconSizes.map(size =>
      sharp(SOURCE_ICON)
        .resize(size, size)
        .toFormat('ico')
        .toBuffer()
    )
  );
  
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'favicon.ico'),
    Buffer.concat(faviconBuffers)
  );

  // Generate PNG icons
  for (const size of ICON_SIZES) {
    await sharp(SOURCE_ICON)
      .resize(size, size)
      .toFormat('png')
      .toFile(path.join(PUBLIC_DIR, `logo${size}.png`));
  }

  // Generate Apple Touch Icon
  await sharp(SOURCE_ICON)
    .resize(180, 180)
    .toFormat('png')
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  console.log('✅ All icons generated successfully!');
}

generateIcons().catch(console.error); 