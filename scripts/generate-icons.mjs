/**
 * Generate all icon sizes from source PNG.
 * Usage: node scripts/generate-icons.mjs <source-png>
 * 
 * Requires: npm install sharp png-to-ico --save-dev (or uses npx)
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SIZES = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024];
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const PUBLIC_ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');

async function main() {
  const src = process.argv[2];
  if (!src) {
    console.error('Usage: node scripts/generate-icons.mjs <source-png>');
    process.exit(1);
  }

  console.log(`Source: ${src}`);
  console.log(`Output: ${ASSETS_DIR}`);

  // Generate all PNG sizes
  for (const size of SIZES) {
    const outName = `icon-${size}.png`;
    const outPath = path.join(ASSETS_DIR, outName);
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`  ✓ ${outName} (${size}×${size})`);
  }

  // icon.png = 256x256 copy
  const iconPng = path.join(ASSETS_DIR, 'icon.png');
  await sharp(src)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(iconPng);
  console.log(`  ✓ icon.png (256×256)`);

  // Generate ICO with multiple sizes (16, 32, 48, 64, 256)
  try {
    const pngToIco = (await import('png-to-ico')).default;
    const icoSizes = [16, 32, 48, 64, 256];
    const buffers = [];
    for (const s of icoSizes) {
      const buf = await sharp(src)
        .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      buffers.push(buf);
    }
    const ico = await pngToIco(buffers);
    fs.writeFileSync(path.join(ASSETS_DIR, 'icon.ico'), ico);
    console.log(`  ✓ icon.ico (multi-size)`);
  } catch (e) {
    console.warn(`  ⚠ Could not generate .ico: ${e.message}`);
    console.warn(`    Install png-to-ico: npm i -D png-to-ico`);
  }

  // Copy branded logos to public/assets
  fs.mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });
  const publicCopies = ['icon-256.png', 'icon-128.png', 'icon-64.png'];
  for (const name of publicCopies) {
    fs.copyFileSync(path.join(ASSETS_DIR, name), path.join(PUBLIC_ASSETS_DIR, name));
  }
  
  // Also generate ezzo-studio-dev logo for public
  await sharp(src)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC_ASSETS_DIR, 'ezzo-studio-dev.png'));
  console.log(`  ✓ public/assets/ezzo-studio-dev.png`);

  console.log('\\n✅ All icons generated successfully!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
