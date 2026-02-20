/**
 * dice.test.js — Unit tests for the dice rolling engine.
 */

(function () {
    const { describe, it, expect } = typeof TestHarness !== 'undefined'
        ? TestHarness
        : require('./test-harness');

    const DiceModule = typeof Dice !== 'undefined' ? Dice : require('../js/dice');

    describe('Dice.rollDie', () => {
        it('should return a value between 1 and sides for d6', () => {
            for (let i = 0; i < 100; i++) {
                const result = DiceModule.rollDie(6);
                expect(result).toBeGreaterThanOrEqual(1);
                expect(result).toBeLessThanOrEqual(6);
            }
        });

        it('should return a value between 1 and sides for d20', () => {
            for (let i = 0; i < 100; i++) {
                const result = DiceModule.rollDie(20);
                expect(result).toBeGreaterThanOrEqual(1);
                expect(result).toBeLessThanOrEqual(20);
            }
        });

        it('should return 1 or 2 for d2', () => {
            for (let i = 0; i < 50; i++) {
                const result = DiceModule.rollDie(2);
                expect(result).toBeGreaterThanOrEqual(1);
                expect(result).toBeLessThanOrEqual(2);
            }
        });

        it('should return values between 1 and 100 for d100', () => {
            for (let i = 0; i < 100; i++) {
                const result = DiceModule.rollDie(100);
                expect(result).toBeGreaterThanOrEqual(1);
                expect(result).toBeLessThanOrEqual(100);
            }
        });
    });

    describe('Dice.rollMultiple', () => {
        it('should return correct structure for a single die type', () => {
            const result = DiceModule.rollMultiple([{ sides: 6, count: 3 }]);
            expect(result.dice).toHaveLength(1);
            expect(result.dice[0].sides).toBe(6);
            expect(result.dice[0].count).toBe(3);
            expect(result.dice[0].results).toHaveLength(3);
        });

        it('should return correct structure for multiple die types', () => {
            const result = DiceModule.rollMultiple([
                { sides: 20, count: 2 },
                { sides: 4, count: 1 },
            ]);
            expect(result.dice).toHaveLength(2);
            expect(result.dice[0].results).toHaveLength(2);
            expect(result.dice[1].results).toHaveLength(1);
        });

        it('should calculate total correctly', () => {
            const result = DiceModule.rollMultiple([{ sides: 6, count: 1 }]);
            expect(result.total).toBe(result.dice[0].results[0]);
        });

        it('total should be sum of all results', () => {
            const result = DiceModule.rollMultiple([
                { sides: 6, count: 2 },
                { sides: 8, count: 1 },
            ]);
            const expectedTotal =
                result.dice[0].results.reduce((a, b) => a + b, 0) +
                result.dice[1].results.reduce((a, b) => a + b, 0);
            expect(result.total).toBe(expectedTotal);
        });
    });

    describe('Dice.isCriticalHit', () => {
        it('should return true when result equals sides', () => {
            expect(DiceModule.isCriticalHit(20, 20)).toBeTrue();
            expect(DiceModule.isCriticalHit(6, 6)).toBeTrue();
        });

        it('should return false when result does not equal sides', () => {
            expect(DiceModule.isCriticalHit(19, 20)).toBeFalse();
            expect(DiceModule.isCriticalHit(1, 20)).toBeFalse();
        });
    });

    describe('Dice.isCriticalFail', () => {
        it('should return true when result is 1', () => {
            expect(DiceModule.isCriticalFail(1, 20)).toBeTrue();
            expect(DiceModule.isCriticalFail(1, 6)).toBeTrue();
        });

        it('should return false when result is not 1', () => {
            expect(DiceModule.isCriticalFail(2, 20)).toBeFalse();
            expect(DiceModule.isCriticalFail(20, 20)).toBeFalse();
        });
    });

    describe('Dice.formatDiceSpec', () => {
        it('should format a single die type', () => {
            expect(DiceModule.formatDiceSpec([{ sides: 20, count: 1 }])).toBe('1d20');
        });

        it('should format multiple die types', () => {
            expect(DiceModule.formatDiceSpec([
                { sides: 20, count: 3 },
                { sides: 4, count: 2 },
            ])).toBe('3d20 + 2d4');
        });
    });

    describe('Dice.parseDiceString', () => {
        it('should parse a simple dice string', () => {
            const result = DiceModule.parseDiceString('3d20');
            expect(result).toHaveLength(1);
            expect(result[0].count).toBe(3);
            expect(result[0].sides).toBe(20);
        });

        it('should parse multiple dice types', () => {
            const result = DiceModule.parseDiceString('2d6 + 1d8');
            expect(result).toHaveLength(2);
            expect(result[0].count).toBe(2);
            expect(result[0].sides).toBe(6);
            expect(result[1].count).toBe(1);
            expect(result[1].sides).toBe(8);
        });

        it('should return null for invalid input', () => {
            expect(DiceModule.parseDiceString('')).toBeNull();
            expect(DiceModule.parseDiceString('abc')).toBeNull();
            expect(DiceModule.parseDiceString('0d6')).toBeNull();
            expect(DiceModule.parseDiceString('1d1')).toBeNull();
        });
    });

    describe('Dice — statistical distribution', () => {
        it('should produce a roughly uniform distribution for d6 over 6000 rolls', () => {
            const counts = [0, 0, 0, 0, 0, 0];
            for (let i = 0; i < 6000; i++) {
                counts[DiceModule.rollDie(6) - 1]++;
            }
            // Each face should appear roughly 1000 times (±400 to be lenient)
            for (let i = 0; i < 6; i++) {
                expect(counts[i]).toBeGreaterThanOrEqual(600);
                expect(counts[i]).toBeLessThanOrEqual(1400);
            }
        });
    });
})();
