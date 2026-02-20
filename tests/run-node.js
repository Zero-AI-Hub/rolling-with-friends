/**
 * run-node.js — Node.js test runner for Dice Online.
 * Run with: node tests/run-node.js
 */

const TestHarness = require('./test-harness');

// Load tests (they self-register)
require('./dice.test');
require('./protocol.test');
require('./state.test');

// Report
const { results, totalPassed, totalFailed } = TestHarness.getResults();

console.log('\n🎲 Dice Online — Test Results\n');

let currentSuite = '';
results.forEach(r => {
    if (r.suite !== currentSuite) {
        currentSuite = r.suite;
        console.log(`\n  ${r.suite}`);
    }
    const icon = r.passed ? '✅' : '❌';
    console.log(`    ${icon} ${r.test}`);
    if (!r.passed) {
        console.log(`       → ${r.error}`);
    }
});

console.log(`\n  ${totalPassed} passed, ${totalFailed} failed\n`);

process.exit(totalFailed > 0 ? 1 : 0);
