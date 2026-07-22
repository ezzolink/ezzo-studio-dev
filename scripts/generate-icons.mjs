import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = join(__dirname, '../assets/logo-ezzo-work-local-dev.png')
const assetsDir = join(__dirname, '../assets')

// PNG sizes needed
const sizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]

console.log('Generating PNG sizes...')
for (const size of sizes) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(assetsDir, `icon-${size}.png`))
  console.log(`  icon-${size}.png`)
}

// Also keep the main logo as-is (used in TitleBar)
// Copy it as the new ezzo-work-local-azul.png (what TitleBar.tsx references)
await sharp(src)
  .resize(null, 36, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(assetsDir, 'ezzo-work-local-azul.png'))
console.log('  ezzo-work-local-azul.png (TitleBar logo)')

// Generate ICO (256px, 128px, 64px, 48px, 32px, 16px embedded)
// electron-builder accepts a 256x256 PNG as icon on Windows — rename to icon.png
// but we also need icon.ico — use the 256px version as base
await sharp(src)
  .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(assetsDir, 'icon.png'))
console.log('  icon.png (256x256, for electron-builder)')

// Generate ICO using raw pixel data for the 4 standard sizes
// Node has no native ICO writer — build it manually (ICO = ICONDIR + ICONDIRENTRY[] + PNG data)
async function pngToIco(inputPath, sizes) {
  const images = await Promise.all(
    sizes.map(s =>
      sharp(inputPath)
        .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  )

  // ICO header: ICONDIR
  const headerSize = 6 + images.length * 16
  let offset = headerSize
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)            // reserved
  header.writeUInt16LE(1, 2)            // type: 1 = ICO
  header.writeUInt16LE(images.length, 4)

  for (let i = 0; i < images.length; i++) {
    const s = sizes[i]
    const entry = 6 + i * 16
    header.writeUInt8(s >= 256 ? 0 : s, entry)      // width (0 = 256)
    header.writeUInt8(s >= 256 ? 0 : s, entry + 1)  // height
    header.writeUInt8(0, entry + 2)    // color count
    header.writeUInt8(0, entry + 3)    // reserved
    header.writeUInt16LE(1, entry + 4) // planes
    header.writeUInt16LE(32, entry + 6)// bit count
    header.writeUInt32LE(images[i].length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += images[i].length
  }

  return Buffer.concat([header, ...images])
}

const icoSizes = [16, 32, 48, 64, 128, 256]
const icoBuffer = await pngToIco(src, icoSizes)
writeFileSync(join(assetsDir, 'icon.ico'), icoBuffer)
console.log('  icon.ico (16,32,48,64,128,256px)')

console.log('\nDone! All icons generated in assets/')
