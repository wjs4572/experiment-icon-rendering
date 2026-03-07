/**
 * icon-configs.js — Shared icon configuration for all 7 format test suites
 *
 * Each format exports an array of icon config objects consumed by StressTestManager.
 * Config shape:
 *   {
 *     name:              string,
 *     selector:          string,          // CSS selector for the icon element
 *     containerSelector: string,          // CSS selector for the container
 *     renderType?:       string,          // e.g. 'inline-svg', 'external-svg', 'optimized-svg'
 *     hasNetworkOverhead: boolean,
 *     src?:              string,          // relative path for external images
 *     svgMarkup?:        string | Function, // inline SVG string (or factory for dynamic IDs)
 *     isCircular?:       boolean
 *   }
 *
 * SVG configs use factory functions for svgMarkup so each call produces unique
 * gradient IDs, avoiding DOM collisions in bulk rendering.
 */

'use strict';

/* ─── Helpers ──────────────────────────────────────────────────── */

function _uid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 6);
}

/* ─── CSS (default — used by css.html) ─────────────────────────── */

const cssIconConfigs = [
    {
        name: 'Remix Icon (Square)',
        selector: '.ri-code-s-slash-line',
        containerSelector: '.ri-code-s-slash-line',
        hasNetworkOverhead: true
    },
    {
        name: 'Pure CSS Icon',
        selector: '.code-slash-icon',
        containerSelector: '.code-slash-icon',
        hasNetworkOverhead: false
    },
    {
        name: 'Minimal CSS Icon',
        selector: '.simple-icon',
        containerSelector: '.simple-icon',
        hasNetworkOverhead: false
    },
    {
        name: 'Circular CSS Icon',
        selector: '.circular-icon',
        containerSelector: '.circular-icon',
        hasNetworkOverhead: false
    },
    {
        name: 'Circular Remix Icon',
        selector: '.ri-code-s-slash-line',
        containerSelector: '.ri-code-s-slash-line',
        hasNetworkOverhead: true,
        isCircular: true
    }
];

/* ─── SVG ──────────────────────────────────────────────────────── */

/**
 * Returns fresh SVG markup with a unique gradient ID each time.
 * @param {'inline'|'optimized'} variant
 * @returns {string}
 */
function _svgMarkup(variant) {
    if (variant === 'inline') {
        const gid = _uid('ig');
        return '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">'
             + '<defs><linearGradient id="' + gid + '" x1="0%" y1="0%" x2="100%" y2="100%">'
             + '<stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />'
             + '<stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />'
             + '</linearGradient></defs>'
             + '<circle cx="24" cy="24" r="24" fill="url(#' + gid + ')" />'
             + '<path d="M18.5 15.5L12 22L18.5 28.5L19.9 27.1L14.8 22L19.9 16.9L18.5 15.5Z'
             + 'M29.5 15.5L28.1 16.9L33.2 22L28.1 27.1L29.5 28.5L36 22L29.5 15.5Z'
             + 'M25.96 13L21.04 31H23.04L27.96 13H25.96Z" fill="white" /></svg>';
    }
    // optimized
    const gid = _uid('og');
    return '<svg width="48" height="48" viewBox="0 0 48 48">'
         + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">'
         + '<stop stop-color="#2563eb"/><stop offset="1" stop-color="#14b8a6"/>'
         + '</linearGradient></defs>'
         + '<circle cx="24" cy="24" r="24" fill="url(#' + gid + ')"/>'
         + '<path d="M18.5 15.5L12 22l6.5 6.5 1.4-1.4L14.8 22l5.1-5.1-1.4-1.4z'
         + 'm11 0l-1.4 1.4 5.1 5.1-5.1 5.1 1.4 1.4L36 22l-6.5-6.5z'
         + 'M25.96 13l-4.92 18h2l4.92-18h-2z" fill="#fff"/></svg>';
}

const svgIconConfigs = [
    {
        name: 'Inline SVG',
        selector: '[aria-label="Inline SVG code icon"]',
        containerSelector: '[aria-label="Inline SVG code icon"]',
        renderType: 'inline-svg',
        hasNetworkOverhead: false,
        get svgMarkup() { return _svgMarkup('inline'); }
    },
    {
        name: 'External SVG',
        selector: 'img[alt="External SVG code icon"]',
        containerSelector: 'img[alt="External SVG code icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon.svg'
    },
    {
        name: 'Optimized SVG',
        selector: '[aria-label="Optimized SVG code icon"]',
        containerSelector: '[aria-label="Optimized SVG code icon"]',
        renderType: 'optimized-svg',
        hasNetworkOverhead: false,
        get svgMarkup() { return _svgMarkup('optimized'); }
    }
];

/* ─── PNG ──────────────────────────────────────────────────────── */

const pngIconConfigs = [
    {
        name: 'Standard PNG',
        selector: 'img[alt="Standard PNG icon"]',
        containerSelector: 'img[alt="Standard PNG icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon.png'
    },
    {
        name: 'High DPI PNG (2×)',
        selector: 'img[alt="High DPI PNG icon"]',
        containerSelector: 'img[alt="High DPI PNG icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon_2x.png'
    },
    {
        name: 'Compressed PNG',
        selector: 'img[alt="Compressed PNG icon"]',
        containerSelector: 'img[alt="Compressed PNG icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon_compressed.png'
    }
];

/* ─── GIF ──────────────────────────────────────────────────────── */

const gifIconConfigs = [
    {
        name: 'Standard GIF',
        selector: 'img[alt="Standard GIF icon"]',
        containerSelector: 'img[alt="Standard GIF icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon.gif'
    },
    {
        name: 'Optimized Palette GIF',
        selector: 'img[alt="Optimized GIF icon"]',
        containerSelector: 'img[alt="Optimized GIF icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon_optimized.gif'
    },
    {
        name: 'Dithered GIF',
        selector: 'img[alt="Dithered GIF icon"]',
        containerSelector: 'img[alt="Dithered GIF icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon_dithered.gif'
    }
];

/* ─── JPEG ─────────────────────────────────────────────────────── */

const jpegIconConfigs = [
    {
        name: 'High Quality JPEG (q90)',
        selector: 'img[alt="High Quality JPEG icon"]',
        containerSelector: 'img[alt="High Quality JPEG icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon.jpg'
    },
    {
        name: 'Medium Compression JPEG (q60)',
        selector: 'img[alt="Medium Quality JPEG icon"]',
        containerSelector: 'img[alt="Medium Quality JPEG icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon_medium.jpg'
    },
    {
        name: 'Heavy Compression JPEG (q20)',
        selector: 'img[alt="Heavy Compression JPEG icon"]',
        containerSelector: 'img[alt="Heavy Compression JPEG icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon_heavy.jpg'
    }
];

/* ─── WebP ─────────────────────────────────────────────────────── */

const webpIconConfigs = [
    {
        name: 'Lossy WebP (q80)',
        selector: 'img[alt="Lossy WebP icon"]',
        containerSelector: 'img[alt="Lossy WebP icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon.webp'
    },
    {
        name: 'Lossless WebP',
        selector: 'img[alt="Lossless WebP icon"]',
        containerSelector: 'img[alt="Lossless WebP icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon_lossless.webp'
    },
    {
        name: 'Optimized WebP (q50)',
        selector: 'img[alt="Optimized WebP icon"]',
        containerSelector: 'img[alt="Optimized WebP icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon_optimized.webp'
    }
];

/* ─── AVIF ─────────────────────────────────────────────────────── */

const avifIconConfigs = [
    {
        name: 'Standard AVIF (q50)',
        selector: 'img[alt="Standard AVIF icon"]',
        containerSelector: 'img[alt="Standard AVIF icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon.avif'
    },
    {
        name: 'Lossless AVIF',
        selector: 'img[alt="Lossless AVIF icon"]',
        containerSelector: 'img[alt="Lossless AVIF icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon_lossless.avif'
    },
    {
        name: 'Compressed AVIF (q20)',
        selector: 'img[alt="Compressed AVIF icon"]',
        containerSelector: 'img[alt="Compressed AVIF icon"]',
        renderType: 'external-svg',
        hasNetworkOverhead: true,
        src: 'img/remix_circle_icon_compressed.avif'
    }
];

/* ─── Lookup Map ───────────────────────────────────────────────── */

const allIconConfigs = {
    css:  cssIconConfigs,
    svg:  svgIconConfigs,
    png:  pngIconConfigs,
    gif:  gifIconConfigs,
    jpeg: jpegIconConfigs,
    webp: webpIconConfigs,
    avif: avifIconConfigs
};

// Expose globally
window.IconConfigs = Object.freeze({
    cssIconConfigs,
    svgIconConfigs,
    pngIconConfigs,
    gifIconConfigs,
    jpegIconConfigs,
    webpIconConfigs,
    avifIconConfigs,
    allIconConfigs
});
