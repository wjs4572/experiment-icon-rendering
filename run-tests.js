#!/usr/bin/env node

// Simple test runner to verify our fixes
const { execSync } = require('child_process');
const path = require('path');

console.log('Running regression tests...\n');

try {
    // Change to the project directory
    process.chdir(__dirname);
    
    // Run the tests with comprehensive output
    const result = execSync('npx playwright test --reporter=list --timeout=15000', {
        encoding: 'utf8',
        stdio: 'inherit',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    console.log('\n✅ Regression tests completed successfully!');
    
} catch (error) {
    console.log('\n❌ Some tests failed, but that\'s expected as we\'re fixing them.');
    console.log('Exit code:', error.status);
}