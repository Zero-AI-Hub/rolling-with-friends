/**
 * test-harness.js — Minimal test framework for Dice Online.
 * 
 * Provides: describe(), it(), expect() with matchers.
 * Works both in browser and Node.js.
 */

const TestHarness = (() => {
    const results = [];
    let currentSuite = '';
    let totalPassed = 0;
    let totalFailed = 0;

    function describe(name, fn) {
        currentSuite = name;
        fn();
    }

    function it(name, fn) {
        try {
            fn();
            totalPassed++;
            results.push({ suite: currentSuite, test: name, passed: true });
        } catch (e) {
            totalFailed++;
            results.push({ suite: currentSuite, test: name, passed: false, error: e.message });
        }
    }

    function expect(actual) {
        return {
            toBe(expected) {
                if (actual !== expected) {
                    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
                }
            },
            toEqual(expected) {
                const a = JSON.stringify(actual);
                const b = JSON.stringify(expected);
                if (a !== b) {
                    throw new Error(`Expected ${b}, got ${a}`);
                }
            },
            toBeGreaterThanOrEqual(expected) {
                if (!(actual >= expected)) {
                    throw new Error(`Expected ${actual} >= ${expected}`);
                }
            },
            toBeLessThanOrEqual(expected) {
                if (!(actual <= expected)) {
                    throw new Error(`Expected ${actual} <= ${expected}`);
                }
            },
            toBeTrue() {
                if (actual !== true) {
                    throw new Error(`Expected true, got ${JSON.stringify(actual)}`);
                }
            },
            toBeFalse() {
                if (actual !== false) {
                    throw new Error(`Expected false, got ${JSON.stringify(actual)}`);
                }
            },
            toBeNull() {
                if (actual !== null) {
                    throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
                }
            },
            toBeNotNull() {
                if (actual === null || actual === undefined) {
                    throw new Error(`Expected non-null, got ${JSON.stringify(actual)}`);
                }
            },
            toContain(item) {
                if (!Array.isArray(actual) || !actual.includes(item)) {
                    throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
                }
            },
            toHaveLength(len) {
                if (!actual || actual.length !== len) {
                    throw new Error(`Expected length ${len}, got ${actual ? actual.length : 'undefined'}`);
                }
            },
            toBeInstanceOf(cls) {
                if (!(actual instanceof cls)) {
                    throw new Error(`Expected instance of ${cls.name}`);
                }
            },
            toThrow() {
                if (typeof actual !== 'function') {
                    throw new Error('Expected a function for toThrow');
                }
                try {
                    actual();
                    throw new Error('Expected function to throw, but it did not');
                } catch (e) {
                    if (e.message === 'Expected function to throw, but it did not') throw e;
                    // Successful: it threw
                }
            },
        };
    }

    function getResults() {
        return { results, totalPassed, totalFailed };
    }

    function reset() {
        results.length = 0;
        totalPassed = 0;
        totalFailed = 0;
        currentSuite = '';
    }

    // Browser rendering
    function renderResults(container) {
        const { results, totalPassed, totalFailed } = getResults();
        container.innerHTML = '';

        const summary = document.createElement('div');
        summary.className = totalFailed === 0 ? 'test-summary pass' : 'test-summary fail';
        summary.textContent = `${totalPassed} passed, ${totalFailed} failed out of ${totalPassed + totalFailed} tests`;
        container.appendChild(summary);

        let currentGroup = '';
        results.forEach(r => {
            if (r.suite !== currentGroup) {
                currentGroup = r.suite;
                const groupEl = document.createElement('h3');
                groupEl.className = 'test-suite-name';
                groupEl.textContent = r.suite;
                container.appendChild(groupEl);
            }

            const testEl = document.createElement('div');
            testEl.className = r.passed ? 'test-result pass' : 'test-result fail';
            testEl.textContent = `${r.passed ? '✅' : '❌'} ${r.test}`;
            if (!r.passed) {
                const errorEl = document.createElement('div');
                errorEl.className = 'test-error';
                errorEl.textContent = r.error;
                testEl.appendChild(errorEl);
            }
            container.appendChild(testEl);
        });
    }

    return {
        describe,
        it,
        expect,
        getResults,
        reset,
        renderResults,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestHarness;
}
