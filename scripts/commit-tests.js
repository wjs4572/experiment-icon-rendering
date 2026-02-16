#!/usr/bin/env node
/**
 * Smart Commit Testing Strategy
 * Runs statistically relevant test subsets with rotation to ensure comprehensive coverage over time
 * while keeping individual test runs fast for commit workflows
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test rotation state file
const ROTATION_FILE = path.join(__dirname, '.test-rotation.json');

// Define test subsets for rotation
const TEST_SUBSETS = [
  {
    name: 'core-functionality',
    tests: ['tests/index.test.js', 'tests/summary.test.js'],
    description: 'Core navigation and summary functionality'
  },
  {
    name: 'data-formats',
    tests: ['tests/css.test.js', 'tests/format-pages.test.js'],
    description: 'CSS and format page testing'
  },
  {
    name: 'comprehensive-testing',
    tests: ['tests/index.test.js', 'tests/css.test.js', 'tests/summary.test.js'],
    description: 'Comprehensive functionality coverage'
  },
  {
    name: 'historical-data',
    tests: ['tests/past-results.test.js', 'tests/format-pages.test.js'],
    description: 'Historical performance and format analysis'
  },
  {
    name: 'cross-browser',
    tests: ['tests/index.test.js', 'tests/css.test.js'],
    browsers: ['--project=chromium', '--project=firefox', '--project=webkit'],
    description: 'Cross-browser compatibility check'
  }
];

function loadRotationState() {
  if (!fs.existsSync(ROTATION_FILE)) {
    return { lastSubset: -1, runCount: 0 };
  }
  try {
    return JSON.parse(fs.readFileSync(ROTATION_FILE, 'utf8'));
  } catch (error) {
    console.warn('⚠️  Could not read rotation state, starting fresh');
    return { lastSubset: -1, runCount: 0 };
  }
}

function saveRotationState(state) {
  fs.writeFileSync(ROTATION_FILE, JSON.stringify(state, null, 2));
}

// Clean up old commit reports
function cleanupOldReports() {
  const reportDirs = ['commit-reports'];
  
  reportDirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      console.log(`🧹 Cleaning up old reports in ${dir}/`);
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  });
}

// Generate commit report files
function generateCommitReports(subset, success, testResults = null) {
  const reportDir = path.join(__dirname, '..', 'commit-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString();
  const reportData = {
    timestamp,
    subset: subset.name,
    description: subset.description,
    tests: subset.tests || [],
    browsers: subset.browsers || [],
    success,
    testResults
  };
  
  // Write JSON report
  const jsonReport = path.join(reportDir, 'latest-commit-results.json');
  fs.writeFileSync(jsonReport, JSON.stringify(reportData, null, 2));
  
  // Write markdown summary
  const mdReport = path.join(reportDir, 'latest-commit-summary.md');
  const status = success ? '✅ PASSED' : '❌ FAILED';
  const mdContent = `# Commit Test Results\n\n**Status:** ${status}\n**Timestamp:** ${timestamp}\n**Test Subset:** ${subset.name}\n**Description:** ${subset.description}\n\n**Test Files:** ${subset.tests?.length || 0}\n${(subset.tests || []).map(t => `- ${t}`).join('\n')}\n\n${subset.browsers ? `**Browser Projects:** ${subset.browsers.length}\n${subset.browsers.map(b => `- ${b}`).join('\n')}\n\n` : ''}**Result:** Tests ${success ? 'completed successfully' : 'failed'}\n`;
  fs.writeFileSync(mdReport, mdContent);
  
  console.log(`\n📊 Commit reports generated:`);
  console.log(`   - ${jsonReport}`);
  console.log(`   - ${mdReport}`);
  console.log(`\n📥 These reports will be included in your commit.`);
}

function getNextSubset(state) {
  const nextIndex = (state.lastSubset + 1) % TEST_SUBSETS.length;
  return { subset: TEST_SUBSETS[nextIndex], index: nextIndex };
}

function runTests(subset) {
  console.log(`\n🚀 Running commit tests: ${subset.name}`);
  console.log(`📝 ${subset.description}\n`);

  let command = 'npx playwright test';
  
  // Add test files
  if (subset.tests) {
    command += ' ' + subset.tests.join(' ');
  }
  
  // Add browser projects if specified
  if (subset.browsers) {
    command += ' ' + subset.browsers.join(' ');
  }
  
  // Use JSON and line reporters for commit tests (JSON for reports, line for progress)
  command += ' --reporter=json,line';
  
  // Run in the project directory
  const cwd = path.join(__dirname, '..');
  
  console.log(`💻 Executing: ${command}\n`);
  
  try {
    const output = execSync(command, { 
      cwd, 
      stdio: 'inherit',
      timeout: 5 * 60 * 1000 // 5 minute timeout
    });
    return { success: true, output };
  } catch (error) {
    console.error(`\n❌ Test subset '${subset.name}' failed`);
    return { success: false, error: error.message };
  }
}

function displayRotationStatus(state, subset) {
  const totalSubsets = TEST_SUBSETS.length;
  const coverage = ((state.runCount % totalSubsets) / totalSubsets * 100).toFixed(0);
  const cycleRun = (state.runCount % totalSubsets) + 1;
  
  console.log(`\n📊 Test Rotation Status:`);
  console.log(`   • Current cycle: ${Math.floor(state.runCount / totalSubsets) + 1}`);
  console.log(`   • Cycle progress: ${cycleRun}/${totalSubsets} (${coverage}% of current cycle)`);
  console.log(`   • Total commits tested: ${state.runCount + 1}`);
  console.log(`   • Next subset: ${subset.name}\n`);
}

function main() {
  console.log('🎯 Smart Commit Testing - Optimized for Speed & Coverage');
  
  // Clean up old commit reports before generating new ones
  cleanupOldReports();
  
  // Load current rotation state
  const state = loadRotationState();
  
  // Get next test subset
  const { subset, index } = getNextSubset(state);
  
  // Display status
  displayRotationStatus(state, subset);
  
  // Run the selected test subset
  const result = runTests(subset);
  const success = result.success;
  
  // Generate commit reports
  generateCommitReports(subset, success, result);
  
  // Update rotation state
  const newState = {
    lastSubset: index,
    runCount: state.runCount + 1,
    lastRun: new Date().toISOString(),
    lastSubsetName: subset.name,
    success
  };
  
  saveRotationState(newState);
  
  if (success) {
    console.log(`\n✅ Commit tests passed! Subset: ${subset.name}`);
    console.log(`📈 Run 'npm run test:full' before major releases for complete coverage`);
    process.exit(0);
  } else {
    console.log(`\n❌ Commit tests failed in subset: ${subset.name}`);
    console.log(`🔍 Run 'npm run test:full' to diagnose broader issues`);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--status')) {
  const state = loadRotationState();
  console.log('\n📊 Current Test Rotation Status:');
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}

if (process.argv.includes('--reset')) {
  saveRotationState({ lastSubset: -1, runCount: 0 });
  console.log('🔄 Test rotation state reset');
  process.exit(0);
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = { TEST_SUBSETS, loadRotationState, saveRotationState };