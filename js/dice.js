/**
 * dice.js — Dice rolling engine for Dice Online.
 * 
 * All dice rolling is done on the DM side to prevent cheating.
 * Pure functions, fully testable, no side effects.
 */

const Dice = (() => {
    /**
     * Roll a single die with the given number of sides.
     * @param {number} sides - Number of sides (>= 2)
     * @returns {number} Random integer from 1 to sides (inclusive)
     */
    function rollDie(sides) {
        return Math.floor(Math.random() * sides) + 1;
    }

    /**
     * Roll multiple dice as specified.
     * @param {Array<{sides: number, count: number}>} diceSpec
     * @returns {{dice: Array<{sides, count, results: number[]}>, total: number}}
     */
    function rollMultiple(diceSpec) {
        let total = 0;
        const dice = diceSpec.map(spec => {
            const results = [];
            for (let i = 0; i < spec.count; i++) {
                const result = rollDie(spec.sides);
                results.push(result);
                total += result;
            }
            return {
                sides: spec.sides,
                count: spec.count,
                results,
            };
        });
        return { dice, total };
    }

    /**
     * Check if a die result is a critical hit (maximum value).
     * Only meaningful for standard dice (d20 typically).
     * @param {number} result
     * @param {number} sides
     * @returns {boolean}
     */
    function isCriticalHit(result, sides) {
        return result === sides;
    }

    /**
     * Check if a die result is a critical fail (natural 1).
     * @param {number} result
     * @param {number} sides
     * @returns {boolean}
     */
    function isCriticalFail(result, sides) {
        return result === 1;
    }

    /**
     * Format a dice specification as a human-readable string.
     * e.g., [{sides: 20, count: 3}, {sides: 4, count: 2}] → "3d20 + 2d4"
     * @param {Array<{sides: number, count: number}>} diceSpec
     * @returns {string}
     */
    function formatDiceSpec(diceSpec) {
        return diceSpec
            .map(d => `${d.count}d${d.sides}`)
            .join(' + ');
    }

    /**
     * Parse a dice string like "3d20 + 2d4" into a dice spec array.
     * @param {string} str
     * @returns {Array<{sides: number, count: number}>|null} null if invalid
     */
    function parseDiceString(str) {
        const parts = str.split('+').map(s => s.trim()).filter(s => s);
        const result = [];
        for (const part of parts) {
            const match = part.match(/^(\d+)d(\d+)$/i);
            if (!match) return null;
            const count = parseInt(match[1], 10);
            const sides = parseInt(match[2], 10);
            if (count < 1 || sides < 2) return null;
            result.push({ sides, count });
        }
        return result.length > 0 ? result : null;
    }

    return {
        rollDie,
        rollMultiple,
        isCriticalHit,
        isCriticalFail,
        formatDiceSpec,
        parseDiceString,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dice;
}
