const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const imgDir = path.join(__dirname, 'src', 'img');
const input = path.join(imgDir, 'remix_circle_icon.svg');

async function run() {
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
}

run().catch(console.error);