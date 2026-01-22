/**
 * PWA Icon Generator Script
 * Generates all required PWA icons from the source SVG
 *
 * Usage: node scripts/generate-pwa-icons.js
 */

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const ICONS_DIR = path.join(__dirname, '../public/icons')
const SOURCE_SVG = path.join(__dirname, '../public/icon.svg')

// Icon sizes for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

// Shortcut icons
const SHORTCUT_ICONS = [
  { name: 'shortcut-payment', size: 96 },
  { name: 'shortcut-statement', size: 96 },
]

async function generateIcons() {
  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true })
  }

  console.log('🎨 Generating PWA icons...\n')

  // Read the source SVG
  const svgBuffer = fs.readFileSync(SOURCE_SVG)

  // Generate regular icons
  for (const size of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`)

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath)

    console.log(`✅ Generated: icon-${size}x${size}.png`)
  }

  // Generate maskable icon (with padding for safe area)
  const maskableSize = 512
  const padding = Math.floor(maskableSize * 0.1) // 10% padding
  const innerSize = maskableSize - (padding * 2)

  const maskableBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 16, g: 185, b: 129, alpha: 1 } // #10b981
    })
    .png()
    .toBuffer()

  await sharp(maskableBuffer)
    .toFile(path.join(ICONS_DIR, 'maskable-icon-512x512.png'))

  console.log('✅ Generated: maskable-icon-512x512.png')

  // Generate shortcut icons (using the same base icon for now)
  for (const shortcut of SHORTCUT_ICONS) {
    const outputPath = path.join(ICONS_DIR, `${shortcut.name}.png`)

    await sharp(svgBuffer)
      .resize(shortcut.size, shortcut.size)
      .png()
      .toFile(outputPath)

    console.log(`✅ Generated: ${shortcut.name}.png`)
  }

  // Generate apple-touch-icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'))

  console.log('✅ Generated: apple-touch-icon.png')

  // Generate favicon.ico (using 32x32 PNG as base)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon.ico'))

  console.log('✅ Generated: favicon.ico')

  // Generate favicon-16x16
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(__dirname, '../public/favicon-16x16.png'))

  console.log('✅ Generated: favicon-16x16.png')

  // Generate favicon-32x32
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon-32x32.png'))

  console.log('✅ Generated: favicon-32x32.png')

  console.log('\n🎉 All PWA icons generated successfully!')
  console.log(`\n📁 Icons saved to: ${ICONS_DIR}`)
}

generateIcons().catch(error => {
  console.error('❌ Error generating icons:', error)
  process.exit(1)
})
