# Icon Rendering Performance Test

This project is designed to test the rendering times of icons across different formats and implementation methods.

## Purpose

The goal is to compare rendering performance across various icon formats:

- **CSS** - Icons defined purely with CSS (gradients, shapes, etc.)
- **SVG** - Scalable Vector Graphics
- **PNG** - Portable Network Graphics (raster)
- **GIF** - Graphics Interchange Format (raster)
- **JPEG** - Joint Photographic Experts Group (raster)
- **WebP** - Modern raster format with better compression
- **AVIF** - AV1 Image File Format (modern raster)

## Format Categorization

Icons will be grouped by format type:

- **Vector**: SVG
- **Raster**: PNG, GIF, JPEG, WebP, AVIF
- **CSS**: Pure CSS implementations

## Source of Truth

- **SVG** serves as the source of truth for all image formats
- All generated images must visually match the CSS-defined icon
- SVG versions will be created to replicate what the CSS defines
- Other formats will be generated from the SVG source

## Implementation Philosophy

This project maintains a minimal approach for the core icon rendering:

- **Plain HTML, CSS, and JavaScript only** for the icon interface
- **Node.js tooling** for comprehensive automated testing
- **No build tools** or frameworks for the rendering code itself
- **Focused on raw performance** without tooling overhead
- **Comprehensive testing** with Playwright for reliability and cross-browser validation

## Usage

### Quick Start

1. **Clone the repository**:

   ```bash
   git clone https://github.com/wjs4572/experiment-icon-rendering.git
   cd experiment-icon-rendering
   ```

2. **Install dependencies**:

   ```bash
   npm install
   npm run test:install  # Install Playwright browsers
   ```

3. **Start the development server**:

   ```bash
   npm run serve
   ```
   
   This launches the icon rendering interface at `http://localhost:3000`

4. **Run tests**:

   ```bash
   npm test              # Full test suite with HTML report
   npm run test:quick    # Quick subset (54 tests) with HTML report  
   npm run test:commit   # Smart commit testing with rotation
   ```

## Testing System

This project uses **Playwright** for comprehensive automated testing across multiple browsers and formats.

### Test Organization

**393 total tests** organized into strategic subsets:

- **Core Functionality** (54 tests): Essential navigation and validation
- **Data Formats** (87 tests): JSON, GeoJSON, CSV, XML, YAML processing  
- **Raster Images** (81 tests): PNG, JPG, GIF, WebP performance
- **Vector/Modern** (81 tests): SVG, AVIF, ICO optimization
- **Cross-Browser** (90 tests): Multi-browser compatibility

### Smart Commit Testing

**Optimized for development workflow** with intelligent test rotation:

```bash
npm run test:commit   # Runs ~54-162 tests (rotates subsets)
```

**Features:**
- 🔄 **Automatic rotation** through test subsets on each commit
- ⚡ **Fast execution** (1-3 minutes vs. 15+ minutes for full suite)
- 📊 **Statistical relevance** - covers all areas over time
- 📝 **Auto-generated reports** in `commit-reports/` directory
- 🧹 **Auto-cleanup** of old reports before new commits

### Test Commands

#### Full Test Suite
```bash
npm test              # All 393 tests with HTML + progress reports
npm run test:full     # Same as above (explicit)
npm run test:report   # Open last HTML test report
```

#### Quick Development
```bash
npm run test:quick    # Core tests (54) with HTML + progress
npm run test:commit   # Smart rotation (54-162 tests)
```

#### Browser-Specific Testing  
```bash
npm run test:browser:chrome   # Chromium only
npm run test:browser:firefox  # Firefox only  
npm run test:browser:webkit   # WebKit/Safari only
```

#### Format-Specific Testing
```bash
npm run test:format:json      # JSON/GeoJSON formats
npm run test:format:css       # CSS/JS processing
npm run test:format:images    # PNG/JPG/GIF rasters
npm run test:format:vector    # SVG/AVIF/WebP vectors
```

#### Development Testing
```bash
npm run test:headed   # Run with visible browser windows
npm run test:ui       # Interactive test UI mode
```

### Commit Reports

Each commit test run generates trackable reports:

- `commit-reports/latest-commit-results.json` - Structured test data
- `commit-reports/latest-commit-summary.md` - Human-readable summary

**Sample commit summary:**
```markdown
# Commit Test Results

**Status:** ✅ PASSED
**Test Subset:** data-formats  
**Description:** JSON, GeoJSON, CSV, XML, YAML data processing
**Test Files:** 87 tests completed successfully
```

### Testing Methodology

1. **Multi-Browser Testing**: Chromium, Firefox, WebKit for cross-platform compatibility
2. **Format Coverage**: All icon formats tested for loading, rendering, and performance
3. **Visual Regression**: Screenshot comparisons ensure visual consistency
4. **Performance Metrics**: Timing measurements for load and render operations
5. **Statistical Rotation**: Smart commit testing ensures comprehensive coverage over time

### WebKit Stability

Optimized configuration for reliable WebKit/Safari testing:
- Process isolation and memory management
- Parallel execution limits (2 workers)
- Enhanced error handling for resource-intensive tests

### Development Workflow

1. **Daily Development**: Use `npm run test:commit` for fast, rotating test coverage
2. **Feature Work**: Use format-specific or browser-specific test commands
3. **Pre-Release**: Use `npm test` for comprehensive validation
4. **Debugging**: Use `npm run test:headed` or `npm run test:ui` for interactive testing

### Technical Architecture

**Local Development Server:**
- Node.js `http-server` with CORS support on port 3000
- Replaces Python server dependency for improved reliability
- Automatic server startup during test execution

**Test Configuration:**
- Playwright v1.40.0 with optimized WebKit stability settings  
- 2-worker parallelization for resource management
- 30-minute global timeout for comprehensive test suites
- JSON and HTML reporting for both automation and human analysis

**Smart Test Rotation:**
- Stateful rotation tracking in `.test-rotation.json`
- 5 predefined test subsets with strategic coverage areas
- Automatic cleanup of previous reports before commit execution
- JSON + Markdown report generation for trackable results

## Licensing

This project uses dual licensing:

- **Software Code**: Licensed under BSD-3-Clause (see [LICENSE-BSD3](LICENSE-BSD3))
- **Data, Results & Documentation**: Licensed under CC BY 4.0 (see [LICENSE-CC-BY-4.0](LICENSE-CC-BY-4.0))

### What This Means

- **Code** (HTML, CSS, JavaScript): You can use, modify, and redistribute under BSD-3-Clause terms
- **Research Data** (performance measurements, findings, documentation): You can use and share under CC BY 4.0 with attribution

## Contributing

When adding new icon formats or tests:

1. **Visual Consistency**: Ensure output matches the CSS reference implementation
2. **Test Coverage**: Add corresponding Playwright tests for new formats or functionality  
3. **Cross-Browser Validation**: Test across Chromium, Firefox, and WebKit
4. **Performance Documentation**: Document findings and performance measurements
5. **Commit Testing**: Run `npm run test:commit` before submitting changes
6. **Full Validation**: Run `npm test` for major changes or new features
7. **Report Inclusion**: Include generated `commit-reports/` in your commits

**Testing Guidelines:**
- Format-specific tests go in `tests/{format}.test.js` 
- Follow existing test patterns for consistency
- Include both positive and negative test cases
- Add performance timing measurements where applicable

**Key Project Files:**
```
├── src/                          # Icon rendering interface
│   ├── index.html               # Main application entry point
│   └── assets/                  # Icon files (SVG, PNG, etc.)
├── tests/                       # Playwright test suites  
│   ├── index.test.js           # Core navigation tests
│   ├── {format}.test.js        # Format-specific tests
│   └── summary.test.js         # Performance summary tests
├── scripts/
│   └── commit-tests.js         # Smart commit testing logic
├── commit-reports/             # Auto-generated test reports
├── playwright.config.js        # Test configuration
└── package.json               # Dependencies and npm scripts
```

Contributions are welcome under the respective licenses.
