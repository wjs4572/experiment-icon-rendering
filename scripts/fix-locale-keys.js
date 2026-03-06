#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'locales');

const files = fs.readdirSync(localesDir)
  .filter(f => f.endsWith('.json') && f !== 'verification.json');

let totalUpdated = 0;

for (const file of files) {
  const filePath = path.join(localesDir, file);
  // Strip BOM if present
  let content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const json = JSON.parse(content);

  if (json['png.examples_title']) {
    console.log(`${file}: already has keys, skipping`);
    continue;
  }

  const ex = json['svg.examples_title'] || 'Icon Examples';
  const ct = json['svg.controls_title'] || 'Performance Testing Controls';

  const newKeys = {
    'png.examples_title': ex,
    'png.standard': 'Standard PNG',
    'png.high_dpi': 'High DPI PNG (2x)',
    'png.compressed': 'Compressed PNG',
    'png.controls_title': ct,
    'gif.examples_title': ex,
    'gif.standard': 'Standard GIF',
    'gif.optimized': 'Optimized Palette GIF',
    'gif.dithered': 'Dithered GIF',
    'gif.controls_title': ct,
    'jpeg.examples_title': ex,
    'jpeg.high_quality': 'High Quality JPEG',
    'jpeg.medium': 'Medium Compression JPEG',
    'jpeg.heavy': 'Heavy Compression JPEG',
    'jpeg.controls_title': ct,
    'webp.examples_title': ex,
    'webp.lossy': 'Lossy WebP',
    'webp.lossless': 'Lossless WebP',
    'webp.optimized': 'Optimized WebP',
    'webp.controls_title': ct,
    'avif.examples_title': ex,
    'avif.standard': 'Standard AVIF',
    'avif.lossless': 'Lossless AVIF',
    'avif.compressed': 'Compressed AVIF',
    'avif.controls_title': ct,
  };

  // Insert after "avif.page_title" in the JSON string
  // We'll do a string replacement to preserve formatting
  const insertAfter = `"avif.page_title": "${json['avif.page_title']}"`;
  const newEntries = Object.entries(newKeys)
    .map(([k, v]) => `    "${k}": "${v}"`)
    .join(',\n');

  const replacement = `${insertAfter},\n${newEntries}`;
  const updated = content.replace(insertAfter, replacement);

  if (updated === content) {
    console.log(`${file}: WARNING - insertion point not found!`);
    continue;
  }

  // Validate the resulting JSON
  try {
    JSON.parse(updated);
  } catch (e) {
    console.log(`${file}: ERROR - resulting JSON is invalid: ${e.message}`);
    continue;
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`${file}: updated (${Object.keys(newKeys).length} keys added)`);
  totalUpdated++;
}

console.log(`\nDone. Updated ${totalUpdated} files.`);
