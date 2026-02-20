/**
 * protocol.test.js — Unit tests for the message protocol.
 */

(function () {
    const { describe, it, expect } = typeof TestHarness !== 'undefined'
        ? TestHarness
        : require('./test-harness');

    const Proto = typeof Protocol !== 'undefined' ? Protocol : require('../js/protocol');

    describe('Protocol.MSG', () => {
        it('should have all expected message types', () => {
            expect(Proto.MSG.PLAYER_INFO).toBe('PLAYER_INFO');
            expect(Proto.MSG.ROLL_REQUEST).toBe('ROLL_REQUEST');
            expect(Proto.MSG.ROLL_RESULT).toBe('ROLL_RESULT');
            expect(Proto.MSG.STATE_SYNC).toBe('STATE_SYNC');
            expect(Proto.MSG.PLAYER_JOINED).toBe('PLAYER_JOINED');
            expect(Proto.MSG.PLAYER_LEFT).toBe('PLAYER_LEFT');
            expect(Proto.MSG.PLAYER_KICKED).toBe('PLAYER_KICKED');
            expect(Proto.MSG.TABLE_CLEARED).toBe('TABLE_CLEARED');
            expect(Proto.MSG.HISTORY_CLEARED).toBe('HISTORY_CLEARED');
        });

        it('should be frozen (immutable)', () => {
            const original = Proto.MSG.ROLL_REQUEST;
            try { Proto.MSG.ROLL_REQUEST = 'hacked'; } catch (e) { }
            expect(Proto.MSG.ROLL_REQUEST).toBe(original);
        });
    });

    describe('Protocol.VISIBILITY', () => {
        it('should have PUBLIC, PRIVATE, TARGETED', () => {
            expect(Proto.VISIBILITY.PUBLIC).toBe('PUBLIC');
            expect(Proto.VISIBILITY.PRIVATE).toBe('PRIVATE');
            expect(Proto.VISIBILITY.TARGETED).toBe('TARGETED');
        });
    });

    describe('Protocol.createPlayerInfo', () => {
        it('should create a valid PLAYER_INFO message', () => {
            const msg = Proto.createPlayerInfo('Gandalf', 'builtin:2');
            expect(msg.type).toBe('PLAYER_INFO');
            expect(msg.nick).toBe('Gandalf');
            expect(msg.avatarData).toBe('builtin:2');
        });
    });

    describe('Protocol.createRollRequest', () => {
        it('should create a valid ROLL_REQUEST message', () => {
            const msg = Proto.createRollRequest(
                [{ sides: 20, count: 1 }],
                'PUBLIC',
                []
            );
            expect(msg.type).toBe('ROLL_REQUEST');
            expect(msg.dice).toHaveLength(1);
            expect(msg.visibility).toBe('PUBLIC');
        });

        it('should default to PUBLIC visibility', () => {
            const msg = Proto.createRollRequest([{ sides: 6, count: 2 }]);
            expect(msg.visibility).toBe('PUBLIC');
        });
    });

    describe('Protocol.createRollResult', () => {
        it('should create a valid ROLL_RESULT message', () => {
            const msg = Proto.createRollResult(
                'peer-123',
                'Gandalf',
                [{ sides: 20, count: 1, results: [17] }],
                17,
                'PUBLIC',
                []
            );
            expect(msg.type).toBe('ROLL_RESULT');
            expect(msg.playerId).toBe('peer-123');
            expect(msg.nick).toBe('Gandalf');
            expect(msg.total).toBe(17);
            expect(msg.timestamp).toBeNotNull();
        });
    });

    describe('Protocol.isValidMessage', () => {
        it('should accept valid messages', () => {
            expect(Proto.isValidMessage({ type: 'ROLL_REQUEST' })).toBeTrue();
            expect(Proto.isValidMessage({ type: 'STATE_SYNC' })).toBeTrue();
        });

        it('should reject null and undefined', () => {
            expect(Proto.isValidMessage(null)).toBeFalse();
            expect(Proto.isValidMessage(undefined)).toBeFalse();
        });

        it('should reject messages without type', () => {
            expect(Proto.isValidMessage({})).toBeFalse();
            expect(Proto.isValidMessage({ foo: 'bar' })).toBeFalse();
        });

        it('should reject unknown message types', () => {
            expect(Proto.isValidMessage({ type: 'UNKNOWN' })).toBeFalse();
        });
    });

    describe('Protocol.isValidDiceSpec', () => {
        it('should accept valid dice specs', () => {
            expect(Proto.isValidDiceSpec([{ sides: 6, count: 2 }])).toBeTrue();
            expect(Proto.isValidDiceSpec([{ sides: 20, count: 1 }, { sides: 4, count: 3 }])).toBeTrue();
        });

        it('should reject empty arrays', () => {
            expect(Proto.isValidDiceSpec([])).toBeFalse();
        });

        it('should reject invalid dice specs', () => {
            expect(Proto.isValidDiceSpec([{ sides: 1, count: 1 }])).toBeFalse(); // min 2 sides
            expect(Proto.isValidDiceSpec([{ sides: 6, count: 0 }])).toBeFalse(); // min 1 count
            expect(Proto.isValidDiceSpec([{ sides: 6.5, count: 1 }])).toBeFalse(); // integer only
        });

        it('should reject non-array input', () => {
            expect(Proto.isValidDiceSpec(null)).toBeFalse();
            expect(Proto.isValidDiceSpec('1d6')).toBeFalse();
        });
    });

    describe('Protocol.isValidRollRequest', () => {
        it('should accept valid roll requests', () => {
            const msg = Proto.createRollRequest([{ sides: 20, count: 1 }], 'PUBLIC');
            expect(Proto.isValidRollRequest(msg)).toBeTrue();
        });

        it('should reject messages with wrong type', () => {
            expect(Proto.isValidRollRequest({ type: 'STATE_SYNC', dice: [{ sides: 6, count: 1 }], visibility: 'PUBLIC' })).toBeFalse();
        });

        it('should reject messages with invalid dice', () => {
            expect(Proto.isValidRollRequest({ type: 'ROLL_REQUEST', dice: [], visibility: 'PUBLIC' })).toBeFalse();
        });
    });
})();
