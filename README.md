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

## Internationalization (i18n)

The performance testing suite supports multiple languages and follows industry standards:

**Supported Languages:**

- 🇺🇸 English (en) - Default
- 🇪🇸 Spanish (es, Español)
- 🇫🇷 French (fr, Français)
- 🇩🇪 German (de, Deutsch)
- 🇯🇵 Japanese (ja, 日本語)
- 🇨🇳 Chinese (zh, 中文)
- 🇵🇹 Portuguese (pt, pt-br, pt-pt, Português)

**Language Features:**

- **Automatic detection** from browser language settings
- **Persistent selection** across pages and sessions
- **Real-time switching** without page reload
- **WCAG compliant** language selector
- **Complete UI translation** including technical terms

**File Structure (Industry Standard):**

```text
src/
├── locales/           # Translation files (industry standard)
│   ├── en.json        # English (default)
│   ├── es.json        # Spanish
│   ├── fr.json        # French
│   ├── de.json        # German
│   ├── ja.json        # Japanese
│   ├── zh.json        # Chinese
│   └── pt.json        # Portuguese
└── js/
    └── i18n.js        # Internationalization system
```

**Usage:**

- Language selector appears in top-right corner of all pages
- Selection is automatically saved and applied across the entire suite
- Falls back to English if translation missing
- Supports technical performance terminology in all languages

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

## Build Pipeline

This section describes the standard workflow for developing, testing, and committing changes to the project.

### Phase 1: Start the HTTP Server

The HTTP server hosts the test suite interface and is automatically started by Playwright during tests. However, you can also start it manually for development:

```bash
npm run serve
```

This launches the server at `http://localhost:3000` serving files from the `src/` directory.

**Configuration:**

- **Command**: `npx http-server src -p 3000 --cors`
- **Port**: 3000
- **CORS**: Enabled for cross-origin requests
- **Auto-start**: Playwright automatically starts this during test runs

### Phase 2: Full Test Suite Verification

After making changes, run the complete test suite to verify all functionality:

```bash
npm test
```

**What this does:**

- Starts the HTTP server (if not already running)
- Runs all 1497 tests across 3 browser engines (Chromium, Firefox, WebKit)
- Generates an HTML report in `playwright-report/`
- Retries failed tests once to handle transient failures
- Reports final pass/fail status

**Expected output:**

```bash
Running 1497 tests using 2 workers
✅ All tests passed (X passed)
```

**On failure:**

If tests fail, the command exits with code 1. Check the HTML report:

```bash
npm run test:report
```

### Phase 3: Pre-Commit Testing

Before committing changes, run the change-aware regression tests to validate only affected functionality:

```bash
npm run test:commit
```

**What this does:**

- Detects all modified files in your working directory
- Maps changed files to their corresponding test suites
- Runs only the tests that cover your changes (typically ~54-162 tests)
- Includes rotation coverage to ensure full suite gets exercised over time
- Fast feedback (usually completes in 1-3 minutes)

**Optional: Dry run** (see what would be tested without running):

```bash
npm run test:commit:dry
```

**Optional: Force full rotation** (ensure all test files exercised):

```bash
npm run test:rotation
```

### Phase 4: Commit Changes

Once pre-commit tests pass, stage and commit your changes:

```bash
# Stage all changes (or use your preferred git tool)
git add tests/*.test.js

# Commit with descriptive message
git commit -m "Short description of changes"
```

**Pre-Commit Hook:**
A git pre-commit hook automatically runs `npm run test:commit` when you try to commit. If tests fail, the commit is blocked. You can bypass this with:

```bash
git commit --no-verify  # Use with caution!
```

**Suggested commit message format:**

```bash
Brief one-line summary

More detailed explanation of:
- What changed
- Why it changed
- Any test improvements or fixes
```

### Phase 5: Verify Commit

After committing, check the commit status:

```bash
npm run test:status
```

This shows which test files were exercised in recent commits and helps you understand rotation coverage.

### Complete Workflow Example

Here's the standard development workflow:

```bash
# 1. Make your code changes
#    (edit test files, fix bugs, add features, etc.)

# 2. Start HTTP server (if developing locally)
npm run serve

# 3. Run pre-commit tests
npm run test:commit
#    ✅ If all pass, proceed to step 4
#    ❌ If failures, fix them and repeat step 3

# 4. Stage your changes
git add tests/my-changed-test.js

# 5. Commit (pre-commit hook automatically runs tests)
git commit -m "Fix test timeout issues for cross-browser compatibility"
#    ✅ If tests pass, commit succeeds
#    ❌ If tests fail, commit is blocked

# 6. Verify commit in git log
git log --oneline -1
```

### Testing During Development

For iterative development, use faster test subsets:

```bash
# Quick validation during active development
npm run test:quick        # Core tests only (54 tests, ~2 min)

# Test specific format or browser
npm run test:browser:firefox          # Firefox only
npm run test:format:css              # CSS-related tests

# Watch mode for interactive development
npm run test:ui           # Opens Playwright test UI
npm run test:headed       # Show browser windows during tests
```

### Troubleshooting Test Issues

**Tests fail on your machine but passed elsewhere:**

- Check that the HTTP server is running or accessible at `http://localhost:3000`
- On Windows, verify WebKit hasn't crashed (it requires specific launch options)
- Increase test timeouts if running under heavy system load

**Browser hangs or crashes:**

- WebKit on Windows needs specific launch options (configured in `playwright.config.js`)
- Close other resource-intensive applications to free up memory
- Check available disk space (tests generate temporary files)

**Port 3000 already in use:**

- Find the process: `netstat -no | findstr :3000` (Windows)
- Kill it or configure a different port in `playwright.config.js`

## Testing Architecture

This project employs **two distinct testing systems** with different purposes:

### 1. Experimental Performance Testing

**Purpose**: Measure and compare actual icon rendering performance across formats

- **Technology**: Pure JavaScript performance measurement within browser
- **Data Collected**: Load times, memory usage, rendering performance metrics
- **Results Storage**: JSON files with timestamped performance measurements
- **Cross-Browser**: Tests run in user's actual browser environment

### 2. Regression Testing System

**Purpose**: Ensure interface functionality and prevent regressions during development

- **Technology**: Playwright automated browser testing framework
- **Data Collected**: Functional test results, visual regression detection
- **Results Storage**: HTML reports and test pass/fail status
- **Cross-Browser**: Automated testing across Chromium, Firefox, WebKit

### Regression Test Organization

**393 total tests** organized into strategic subsets:

- **Core Functionality** (54 tests): Essential navigation and validation
- **Data Formats** (87 tests): JSON, GeoJSON, CSV, XML, YAML processing  
- **Raster Images** (81 tests): PNG, JPG, GIF, WebP performance
- **Vector/Modern** (81 tests): SVG, AVIF, ICO optimization
- **Cross-Browser** (90 tests): Multi-browser compatibility

### Smart Commit Regression Testing

**Optimized for development workflow** with intelligent regression test rotation:

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

### Regression Test Reports

Each commit regression test run generates trackable reports:

- `commit-reports/latest-commit-results.json` - Structured regression test data
- `commit-reports/latest-commit-summary.md` - Human-readable regression summary

**Sample commit regression summary:**

```markdown
# Commit Regression Test Results

**Status:** ✅ PASSED
**Test Subset:** data-formats  
**Description:** JSON, GeoJSON, CSV, XML, YAML data processing
**Test Files:** 87 regression tests completed successfully
```

### Testing Methodology

**Experimental Performance Testing:**

1. **Browser-Native Measurement**: JavaScript performance APIs measure actual rendering times
2. **Format Coverage**: All icon formats tested for loading, rendering, and memory usage
3. **Multiple Iterations**: Statistical sampling with multiple measurement cycles
4. **Cross-Browser Comparison**: Same tests executed in different browser engines
5. **Environmental Control**: Standardized system configuration for reproducible results

**Regression Testing (Playwright):**

1. **Multi-Browser Validation**: Automated testing across Chromium, Firefox, WebKit
2. **Functional Verification**: Interface elements, navigation, and user interactions
3. **Visual Regression**: Screenshot comparisons ensure visual consistency
4. **Statistical Rotation**: Smart commit testing ensures comprehensive coverage over time
5. **Development Safety**: Prevents regressions during code changes

## Browser-Specific Testing Architecture

### Current Implementation (In-Browser Testing)

**🌐 This version is designed for browser-specific performance testing:**

- **Single Browser Environment**: All experimental performance results are specific to the browser in which they are executed
- **Browser Identification**: Exported test results include comprehensive browser information (`userAgent`, `platform`, etc.)
- **Reproducible Within Environment**: Results are scientifically valid for repeatability within the same browser/system configuration
- **Environment Documentation**: System specifications integration ensures complete environmental context

**Key characteristics:**

- ✅ **Accurate for single browser**: Precise measurement of rendering performance in your target browser
- ✅ **Scientific reproducibility**: Complete system and browser environment documentation
- ✅ **Immediate feedback**: Real-time performance analysis during interactive testing
- ⚠️ **Browser-specific results**: Performance data is not directly comparable across different browsers

### Cross-Browser Regression Testing

**The Playwright regression testing system provides multi-browser validation:**

- **Functional Testing**: Ensures interface works correctly across Chromium, Firefox, WebKit
- **Automated Coverage**: 393 tests validate functionality across all browser engines
- **Development Safety**: Prevents browser-specific regressions during code changes
- **Visual Consistency**: Screenshot comparisons ensure consistent appearance

### Future Development: CLI Multi-Browser Testing

**🛠️ Potential future enhancement:**

A future project version may provide CLI tools for automated multi-browser performance testing and comparison:

- **Automated Execution**: Run identical performance tests across multiple browser engines
- **Comparative Analysis**: Direct performance comparisons between browsers
- **Batch Processing**: Automated test execution without manual browser interaction
- **Cross-Browser Reporting**: Unified reports showing performance differences across browsers

**Current Focus**: The present version prioritizes accuracy and reproducibility within individual browser environments, ensuring that experimental results are scientifically valid for the specific testing context.

### Experimental Environment Documentation

**Critical for Reproducibility**: When collecting experimental performance measurements, document your system configuration to ensure reproducible and comparable results.

**Recommended System Information Collection:**

- **System Configuration**: Model, operating system, boot configuration
- **Processor**: CPU model, architecture, core count, cache sizes, generation
- **Memory System**: Total RAM, configuration, speed specifications
- **Graphics Hardware**: Integrated and discrete GPU details, driver versions
- **Storage Subsystem**: Drive types (SSD/HDD), specific models, performance characteristics
- **Network Environment**: Connection type, speeds, latency characteristics

**System Information Tools:**

- **Belarc Advisor** (Recommended): Free tool that generates comprehensive system reports including hardware specifications, software versions, and system configurations. Available at belarc.com/free_download.html
- **Windows**: System Information (msinfo32), Device Manager, PowerShell hardware commands
- **macOS**: System Information, System Profiler, terminal hardware commands  
- **Linux**: lscpu, lshw, dmidecode, /proc filesystem information

**Performance Test Integration:**

The performance testing interface includes a **System Specs** button that allows you to:

**Performance Test Integration:**

The performance testing interface includes a **System Specs** button that allows you to:

1. **Input System Information**: Guided form with fields for all critical hardware specifications
2. **Tool Guidance**: Step-by-step instructions for using Belarc Advisor to collect complete system data
3. **Auto-Detection**: Automatically captures browser-detectable information (CPU cores, memory, screen resolution)
4. **Export Integration**: System specifications are automatically included in all exported test results
5. **Persistent Storage**: Your system information is saved locally and reused across test sessions

**Exported Results Structure:**

Test results now include a comprehensive `systemSpecifications` section with:

- **Auto-detected browser information** (user agent, platform, hardware concurrency, screen details)
- **Manual system specifications** (CPU, memory, graphics, storage, network details)
- **Data collection metadata** (tool used, timestamp, completeness status)
- **Reproducibility guidance** for other researchers using different hardware configurations

**Performance Measurement Best Practices:**

- **Browser Versions**: Document specific browser engines and versions used
- **Environmental Control**: Consistent power state, thermal conditions, background processes
- **Test Conditions**: Dedicated testing sessions with minimal concurrent applications
- **Measurement Context**: Record system load, available memory, active services

**Reproducibility Guidelines:**

- Different hardware configurations will show different absolute performance values
- **Relative comparisons** between formats should remain consistent across similar systems
- GPU acceleration availability may significantly impact rendering performance
- Memory bandwidth and CPU architecture affect JavaScript execution speed
- Include system specifications in your experimental performance reports

### WebKit Stability & Test Reliability

**Critical for Windows Systems**: WebKit requires specific launch options to prevent browser crashes during intensive testing. These options may affect performance measurements and should be considered when interpreting results.

**Required WebKit Launch Options:**

```javascript
launchOptions: {
  args: [
    '--disable-accelerated-compositing',    // Prevents GPU-related crashes
    '--disable-background-timer-throttling', // Maintains consistent timing
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',     // Prevents process backgrounding issues
    '--disable-features=TranslateUI',       // Removes translation overhead
    '--disable-dev-shm-usage',             // Avoids shared memory issues
    '--no-startup-window',                 // Reduces startup overhead
    '--disable-gpu',                       // Forces software rendering
    '--disable-software-rasterizer',       // Prevents rendering conflicts
    '--disable-extensions',                // Removes extension overhead
    '--disable-plugins',                   // Eliminates plugin interference
    '--no-sandbox',                        // Bypasses sandboxing on Windows
    '--disable-web-security',              // Reduces security overhead
    '--disable-features=VizDisplayCompositor', // Prevents compositor crashes
    '--single-process',                    // Critical: Prevents multi-process crashes
    '--disable-background-media-suspend'   // Maintains media consistency
  ],
  handleSIGTERM: false,                   // Enhanced signal handling
  handleSIGINT: false
}
```

**Performance Impact Considerations:**

- **GPU Acceleration Disabled**: WebKit tests use software rendering only
- **Single-Process Mode**: May show different memory patterns vs. normal WebKit usage
- **Background Throttling Disabled**: May affect timing measurements compared to default WebKit behavior
- **Security Features Disabled**: Testing environment differs from production WebKit

**Why These Options Are Required:**

- WebKit on Windows exhibits process crashes (exit code 3221225477) without these stability flags
- Multi-process architecture creates resource conflicts during parallel test execution  
- GPU acceleration causes rendering failures in headless testing environments
- Sandboxing interferes with test automation on Windows systems

**Test Result Interpretation:**
When comparing performance across browsers, note that WebKit results reflect a specifically configured environment optimized for testing reliability rather than default browser behavior. These configurations ensure testing consistency but may not represent typical Safari/WebKit performance characteristics.

### Development Workflow

**Experimental Performance Testing:**

1. **Performance Measurement**: Use browser interface at `http://localhost:3000` to collect performance data
2. **Cross-Browser Comparison**: Manually test in different browsers for comparative analysis
3. **Data Collection**: Record measurements with system specifications for reproducibility

**Regression Testing Workflow:**

1. **Daily Development**: Use `npm run test:commit` for fast, rotating regression test coverage
2. **Feature Work**: Use format-specific or browser-specific regression test commands
3. **Pre-Release**: Use `npm test` for comprehensive regression validation
4. **Debugging**: Use `npm run test:headed` or `npm run test:ui` for interactive regression testing

### Technical Architecture

**Experimental Performance Testing Infrastructure:**

- Pure JavaScript performance measurement APIs
- Browser-native timing and memory profiling
- Cross-format comparison within same browser session
- Manual data collection and analysis workflow

**Regression Testing Infrastructure:**

- Node.js `http-server` with CORS support on port 3000
- Replaces Python server dependency for improved reliability
- Automatic server startup during regression test execution

**Regression Test Configuration:**

- Playwright v1.40.0 with optimized WebKit stability settings  
- 2-worker parallelization for resource management
- 30-minute global timeout for comprehensive regression test suites
- JSON and HTML reporting for both automation and human analysis

**Smart Regression Test Rotation:**

- Stateful rotation tracking in `.test-rotation.json`
- 5 predefined test subsets with strategic coverage areas
- Automatic cleanup of previous reports before commit execution
- JSON + Markdown report generation for trackable regression results

## Licensing

This project uses dual licensing:

- **Software Code**: Licensed under BSD-3-Clause (see [LICENSE-BSD3](LICENSE-BSD3))
- **Data, Results & Documentation**: Licensed under CC BY 4.0 (see [LICENSE-CC-BY-4.0](LICENSE-CC-BY-4.0))

### What This Means

- **Code** (HTML, CSS, JavaScript): You can use, modify, and redistribute under BSD-3-Clause terms
- **Research Data** (performance measurements, findings, documentation): You can use and share under CC BY 4.0 with attribution

## Contributing

When adding new icon formats or experimental features:

1. **Visual Consistency**: Ensure output matches the CSS reference implementation
2. **Experimental Testing**: Manually validate performance using the browser interface
3. **Regression Testing**: Add corresponding Playwright tests for new formats or functionality  
4. **Cross-Browser Validation**: Test across Chromium, Firefox, and WebKit
5. **Performance Documentation**: Document experimental findings and measurements with system specifications
6. **Regression Testing**: Run `npm run test:commit` before submitting changes
7. **Full Validation**: Run `npm test` for major changes or new features
8. **Report Inclusion**: Include generated `commit-reports/` (regression test results) in your commits

**Testing Guidelines:**

- **Experimental Performance**: Use browser interface to collect performance data
- **Regression Tests**: Format-specific Playwright tests go in `tests/{format}.test.js`
- Follow existing test patterns for consistency
- Include both positive and negative test cases for regressions
- Document experimental performance measurements with environment details

**Key Project Files:**
**Key Project Files:**

```text
├── src/                          # Icon rendering interface (experimental testing)
│   ├── index.html               # Main application entry point
│   └── assets/                  # Icon files (SVG, PNG, etc.)
├── tests/                       # Playwright regression test suites  
│   ├── index.test.js           # Core navigation regression tests
│   ├── {format}.test.js        # Format-specific regression tests
│   └── summary.test.js         # Interface validation tests
├── scripts/
│   └── commit-tests.js         # Smart commit regression testing logic
├── commit-reports/             # Auto-generated regression test reports
├── playwright.config.js        # Regression test configuration
└── package.json               # Dependencies and npm scripts
```

Contributions are welcome under the respective licenses.
