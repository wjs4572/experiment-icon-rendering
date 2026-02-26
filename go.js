const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const imgDir = path.join(__dirname, 'src', 'img');
const input = path.join(imgDir, 'remix_circle_icon.svg');

async function run() {
  // Raster format conversions from SVG source
  const formats = [
    { ext: 'webp', p: sharp(input).webp({ quality: 80 }) },
    { ext: 'avif', p: sharp(input).avif({ quality: 65, lossless: false }) },
    { ext: 'jpg',  p: sharp(input).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }) },
    { ext: 'gif',  p: sharp(input).gif() }
  ];
  for (const f of formats) {
    const out = path.join(imgDir, `remix_circle_icon.${f.ext}`);
    await f.p.toFile(out);
    console.log(`✔ ${f.ext}: ${(fs.statSync(out).size / 1024).toFixed(2)} KB`);
  }

  // PNG variants for performance comparison testing
  // Standard PNG (48×48) — already exists from SVG render, regenerate for consistency
  const standardOut = path.join(imgDir, 'remix_circle_icon.png');
  await sharp(input)
    .resize(48, 48)
    .png({ compressionLevel: 6 })  // default compression
    .toFile(standardOut);
  console.log(`✔ png (standard 48×48): ${(fs.statSync(standardOut).size / 1024).toFixed(2)} KB`);

  // High DPI PNG (96×96, 2× resolution) — rendered at display size for HiDPI/Retina screens
  const highDpiOut = path.join(imgDir, 'remix_circle_icon_2x.png');
  await sharp(input)
    .resize(96, 96)
    .png({ compressionLevel: 6 })
    .toFile(highDpiOut);
  console.log(`✔ png (high-dpi 96×96): ${(fs.statSync(highDpiOut).size / 1024).toFixed(2)} KB`);

  // Compressed PNG (48×48) — maximum compression + palette optimization
  const compressedOut = path.join(imgDir, 'remix_circle_icon_compressed.png');
  await sharp(input)
    .resize(48, 48)
    .png({ compressionLevel: 9, palette: true, colours: 64, effort: 10 })
    .toFile(compressedOut);
  console.log(`✔ png (compressed 48×48): ${(fs.statSync(compressedOut).size / 1024).toFixed(2)} KB`);

  // GIF variants for performance comparison testing
  // Standard GIF (48×48) — already created above, regenerate with explicit size
  const gifStandardOut = path.join(imgDir, 'remix_circle_icon.gif');
  await sharp(input)
    .resize(48, 48)
    .gif()
    .toFile(gifStandardOut);
  console.log(`✔ gif (standard 48×48): ${(fs.statSync(gifStandardOut).size / 1024).toFixed(2)} KB`);

  // Optimized GIF (48×48) — reduced palette (64 colours) for smaller file size
  const gifOptimizedOut = path.join(imgDir, 'remix_circle_icon_optimized.gif');
  await sharp(input)
    .resize(48, 48)
    .gif({ colours: 64 })
    .toFile(gifOptimizedOut);
  console.log(`✔ gif (optimized 48×48): ${(fs.statSync(gifOptimizedOut).size / 1024).toFixed(2)} KB`);

  // Dithered GIF (48×48) — full 256-colour palette with dithering for better gradient rendering
  const gifDitheredOut = path.join(imgDir, 'remix_circle_icon_dithered.gif');
  await sharp(input)
    .resize(48, 48)
    .gif({ colours: 256, dither: 1.0 })
    .toFile(gifDitheredOut);
  console.log(`✔ gif (dithered 48×48): ${(fs.statSync(gifDitheredOut).size / 1024).toFixed(2)} KB`);

  // JPEG variants for performance comparison testing
  // All JPEGs require white background flatten because JPEG has no alpha channel.
  // High Quality JPEG (48×48, quality 90) — already created above, regenerate for consistency
  const jpgHighOut = path.join(imgDir, 'remix_circle_icon.jpg');
  await sharp(input)
    .resize(48, 48)
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 90 })
    .toFile(jpgHighOut);
  console.log(`✔ jpg (high quality q90): ${(fs.statSync(jpgHighOut).size / 1024).toFixed(2)} KB`);

  // Medium Quality JPEG (48×48, quality 60) — balanced size/quality trade-off
  const jpgMediumOut = path.join(imgDir, 'remix_circle_icon_medium.jpg');
  await sharp(input)
    .resize(48, 48)
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 60 })
    .toFile(jpgMediumOut);
  console.log(`✔ jpg (medium quality q60): ${(fs.statSync(jpgMediumOut).size / 1024).toFixed(2)} KB`);

  // Heavy Compression JPEG (48×48, quality 20) — aggressive compression, visible artifacts
  const jpgHeavyOut = path.join(imgDir, 'remix_circle_icon_heavy.jpg');
  await sharp(input)
    .resize(48, 48)
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 20 })
    .toFile(jpgHeavyOut);
  console.log(`✔ jpg (heavy compression q20): ${(fs.statSync(jpgHeavyOut).size / 1024).toFixed(2)} KB`);

  // WebP variants for performance comparison testing
  // Lossy WebP (48×48, quality 80) — already created above, regenerate with explicit size
  const webpLossyOut = path.join(imgDir, 'remix_circle_icon.webp');
  await sharp(input)
    .resize(48, 48)
    .webp({ quality: 80 })
    .toFile(webpLossyOut);
  console.log(`✔ webp (lossy q80): ${(fs.statSync(webpLossyOut).size / 1024).toFixed(2)} KB`);

  // Lossless WebP (48×48) — perfect quality, larger file
  const webpLosslessOut = path.join(imgDir, 'remix_circle_icon_lossless.webp');
  await sharp(input)
    .resize(48, 48)
    .webp({ lossless: true })
    .toFile(webpLosslessOut);
  console.log(`✔ webp (lossless): ${(fs.statSync(webpLosslessOut).size / 1024).toFixed(2)} KB`);

  // Near-lossless / optimized WebP (48×48, quality 50, effort 6) — aggressive size optimization
  const webpOptimizedOut = path.join(imgDir, 'remix_circle_icon_optimized.webp');
  await sharp(input)
    .resize(48, 48)
    .webp({ quality: 50, effort: 6 })
    .toFile(webpOptimizedOut);
  console.log(`✔ webp (optimized q50): ${(fs.statSync(webpOptimizedOut).size / 1024).toFixed(2)} KB`);

  // AVIF variants for performance comparison testing
  // Standard AVIF (48×48, quality 50) — default AV1 still-image compression
  const avifStandardOut = path.join(imgDir, 'remix_circle_icon.avif');
  await sharp(input)
    .resize(48, 48)
    .avif({ quality: 50 })
    .toFile(avifStandardOut);
  console.log(`✔ avif (standard q50): ${(fs.statSync(avifStandardOut).size / 1024).toFixed(2)} KB`);

  // Lossless AVIF (48×48) — perfect quality, larger file
  const avifLosslessOut = path.join(imgDir, 'remix_circle_icon_lossless.avif');
  await sharp(input)
    .resize(48, 48)
    .avif({ lossless: true })
    .toFile(avifLosslessOut);
  console.log(`✔ avif (lossless): ${(fs.statSync(avifLosslessOut).size / 1024).toFixed(2)} KB`);

  // High Compression AVIF (48×48, quality 20) — aggressive compression for minimum size
  const avifCompressedOut = path.join(imgDir, 'remix_circle_icon_compressed.avif');
  await sharp(input)
    .resize(48, 48)
    .avif({ quality: 20, effort: 9 })
    .toFile(avifCompressedOut);
  console.log(`✔ avif (compressed q20): ${(fs.statSync(avifCompressedOut).size / 1024).toFixed(2)} KB`);
}