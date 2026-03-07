// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS — icon-configs.js (src/js/icon-configs.js)
 * Tests shared icon config arrays for all 7 formats: shape, counts,
 * required properties, SVG markup factories, and lookup map.
 */

const HARNESS = 'test-harness.html';

test.describe('IconConfigs Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(HARNESS);
        await page.waitForFunction(() => window.__harnessReady === true);
    });

    test.describe('Global Exposure', () => {
        test('window.IconConfigs is an object', async ({ page }) => {
            const type = await page.evaluate(() => typeof window.IconConfigs);
            expect(type).toBe('object');
        });

        test('IconConfigs is frozen (immutable)', async ({ page }) => {
            const frozen = await page.evaluate(() => Object.isFrozen(window.IconConfigs));
            expect(frozen).toBe(true);
        });

        test('exposes per-format arrays and allIconConfigs map', async ({ page }) => {
            const keys = await page.evaluate(() => Object.keys(window.IconConfigs).sort());
            expect(keys).toEqual([
                'allIconConfigs',
                'avifIconConfigs',
                'cssIconConfigs',
                'gifIconConfigs',
                'jpegIconConfigs',
                'pngIconConfigs',
                'svgIconConfigs',
                'webpIconConfigs'
            ]);
        });
    });

    test.describe('allIconConfigs lookup map', () => {
        test('contains all 7 format keys', async ({ page }) => {
            const keys = await page.evaluate(() => Object.keys(window.IconConfigs.allIconConfigs).sort());
            expect(keys).toEqual(['avif', 'css', 'gif', 'jpeg', 'png', 'svg', 'webp']);
        });

        test('each key maps to the same array as the named export', async ({ page }) => {
            const matches = await page.evaluate(() => {
                const ic = window.IconConfigs;
                return {
                    css:  ic.allIconConfigs.css  === ic.cssIconConfigs,
                    svg:  ic.allIconConfigs.svg  === ic.svgIconConfigs,
                    png:  ic.allIconConfigs.png  === ic.pngIconConfigs,
                    gif:  ic.allIconConfigs.gif  === ic.gifIconConfigs,
                    jpeg: ic.allIconConfigs.jpeg === ic.jpegIconConfigs,
                    webp: ic.allIconConfigs.webp === ic.webpIconConfigs,
                    avif: ic.allIconConfigs.avif === ic.avifIconConfigs
                };
            });
            for (const [fmt, same] of Object.entries(matches)) {
                expect(same, `allIconConfigs.${fmt} should reference the named array`).toBe(true);
            }
        });
    });

    test.describe('CSS icon configs', () => {
        test('contains 5 configs', async ({ page }) => {
            const count = await page.evaluate(() => window.IconConfigs.cssIconConfigs.length);
            expect(count).toBe(5);
        });

        test('each config has required properties', async ({ page }) => {
            const configs = await page.evaluate(() => window.IconConfigs.cssIconConfigs);
            for (const c of configs) {
                expect(c).toHaveProperty('name');
                expect(c).toHaveProperty('selector');
                expect(c).toHaveProperty('containerSelector');
                expect(typeof c.hasNetworkOverhead).toBe('boolean');
            }
        });

        test('expected icon names are present', async ({ page }) => {
            const names = await page.evaluate(() =>
                window.IconConfigs.cssIconConfigs.map(c => c.name)
            );
            expect(names).toContain('Remix Icon (Square)');
            expect(names).toContain('Pure CSS Icon');
            expect(names).toContain('Minimal CSS Icon');
            expect(names).toContain('Circular CSS Icon');
            expect(names).toContain('Circular Remix Icon');
        });

        test('Remix icons have hasNetworkOverhead=true', async ({ page }) => {
            const configs = await page.evaluate(() => window.IconConfigs.cssIconConfigs);
            const remix = configs.filter(c => c.name.includes('Remix'));
            for (const c of remix) {
                expect(c.hasNetworkOverhead).toBe(true);
            }
        });

        test('Pure CSS icons have hasNetworkOverhead=false', async ({ page }) => {
            const configs = await page.evaluate(() => window.IconConfigs.cssIconConfigs);
            const pure = configs.filter(c => c.name.includes('Pure CSS') || c.name.includes('Minimal'));
            for (const c of pure) {
                expect(c.hasNetworkOverhead).toBe(false);
            }
        });

        test('Circular Remix Icon has isCircular flag', async ({ page }) => {
            const configs = await page.evaluate(() => window.IconConfigs.cssIconConfigs);
            const circular = configs.find(c => c.name === 'Circular Remix Icon');
            expect(circular.isCircular).toBe(true);
        });
    });

    test.describe('SVG icon configs', () => {
        test('contains 3 configs', async ({ page }) => {
            const count = await page.evaluate(() => window.IconConfigs.svgIconConfigs.length);
            expect(count).toBe(3);
        });

        test('expected names: Inline SVG, External SVG, Optimized SVG', async ({ page }) => {
            const names = await page.evaluate(() =>
                window.IconConfigs.svgIconConfigs.map(c => c.name)
            );
            expect(names).toEqual(['Inline SVG', 'External SVG', 'Optimized SVG']);
        });

        test('each config has renderType', async ({ page }) => {
            const types = await page.evaluate(() =>
                window.IconConfigs.svgIconConfigs.map(c => c.renderType)
            );
            expect(types).toContain('inline-svg');
            expect(types).toContain('external-svg');
            expect(types).toContain('optimized-svg');
        });

        test('Inline SVG svgMarkup produces valid SVG string', async ({ page }) => {
            const markup = await page.evaluate(() => {
                const inline = window.IconConfigs.svgIconConfigs.find(c => c.name === 'Inline SVG');
                return inline.svgMarkup;
            });
            expect(markup).toContain('<svg');
            expect(markup).toContain('</svg>');
            expect(markup).toContain('linearGradient');
        });

        test('Inline SVG generates unique gradient IDs per access', async ({ page }) => {
            const unique = await page.evaluate(() => {
                const inline = window.IconConfigs.svgIconConfigs.find(c => c.name === 'Inline SVG');
                const ids = new Set();
                for (let i = 0; i < 20; i++) {
                    const m = inline.svgMarkup;
                    const match = m.match(/id="(ig[^"]+)"/);
                    if (match) ids.add(match[1]);
                }
                return ids.size;
            });
            expect(unique).toBe(20);
        });

        test('Optimized SVG svgMarkup produces valid SVG string', async ({ page }) => {
            const markup = await page.evaluate(() => {
                const opt = window.IconConfigs.svgIconConfigs.find(c => c.name === 'Optimized SVG');
                return opt.svgMarkup;
            });
            expect(markup).toContain('<svg');
            expect(markup).toContain('</svg>');
        });

        test('Optimized SVG generates unique gradient IDs per access', async ({ page }) => {
            const unique = await page.evaluate(() => {
                const opt = window.IconConfigs.svgIconConfigs.find(c => c.name === 'Optimized SVG');
                const ids = new Set();
                for (let i = 0; i < 20; i++) {
                    const m = opt.svgMarkup;
                    const match = m.match(/id="(og[^"]+)"/);
                    if (match) ids.add(match[1]);
                }
                return ids.size;
            });
            expect(unique).toBe(20);
        });

        test('External SVG has src path', async ({ page }) => {
            const src = await page.evaluate(() => {
                const ext = window.IconConfigs.svgIconConfigs.find(c => c.name === 'External SVG');
                return ext.src;
            });
            expect(src).toBe('img/remix_circle_icon.svg');
        });
    });

    /** Image format configs share a common shape — test them parametrically */
    const imageFormats = [
        { key: 'png', prop: 'pngIconConfigs', count: 3, names: ['Standard PNG', 'High DPI PNG (2×)', 'Compressed PNG'] },
        { key: 'gif', prop: 'gifIconConfigs', count: 3, names: ['Standard GIF', 'Optimized Palette GIF', 'Dithered GIF'] },
        { key: 'jpeg', prop: 'jpegIconConfigs', count: 3, names: ['High Quality JPEG (q90)', 'Medium Compression JPEG (q60)', 'Heavy Compression JPEG (q20)'] },
        { key: 'webp', prop: 'webpIconConfigs', count: 3, names: ['Lossy WebP (q80)', 'Lossless WebP', 'Optimized WebP (q50)'] },
        { key: 'avif', prop: 'avifIconConfigs', count: 3, names: ['Standard AVIF (q50)', 'Lossless AVIF', 'Compressed AVIF (q20)'] },
    ];

    for (const fmt of imageFormats) {
        test.describe(`${fmt.key.toUpperCase()} icon configs`, () => {
            test(`contains ${fmt.count} configs`, async ({ page }) => {
                const count = await page.evaluate(
                    (p) => window.IconConfigs[p].length,
                    fmt.prop
                );
                expect(count).toBe(fmt.count);
            });

            test('each config has required properties', async ({ page }) => {
                const configs = await page.evaluate(
                    (p) => window.IconConfigs[p],
                    fmt.prop
                );
                for (const c of configs) {
                    expect(c).toHaveProperty('name');
                    expect(c).toHaveProperty('selector');
                    expect(c).toHaveProperty('containerSelector');
                    expect(c).toHaveProperty('src');
                    expect(c.hasNetworkOverhead).toBe(true);
                }
            });

            test('expected names are present', async ({ page }) => {
                const names = await page.evaluate(
                    (p) => window.IconConfigs[p].map(c => c.name),
                    fmt.prop
                );
                expect(names).toEqual(fmt.names);
            });

            test('src paths are non-empty strings', async ({ page }) => {
                const srcs = await page.evaluate(
                    (p) => window.IconConfigs[p].map(c => c.src),
                    fmt.prop
                );
                for (const s of srcs) {
                    expect(typeof s).toBe('string');
                    expect(s.length).toBeGreaterThan(0);
                }
            });
        });
    }
});
