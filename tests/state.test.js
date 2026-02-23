/**
 * state.test.js — Unit tests for game state management.
 */

(function () {
    const { describe, it, expect } = typeof TestHarness !== 'undefined'
        ? TestHarness
        : require('./test-harness');

    const State = typeof GameState !== 'undefined' ? GameState : require('../js/state');

    describe('GameState.create', () => {
        it('should create a fresh state with correct fields', () => {
            const s = State.create('test-room', 'DM', 'builtin:0');
            expect(s.roomName).toBe('test-room');
            expect(s.dmNick).toBe('DM');
            expect(s.dmAvatar).toBe('builtin:0');
            expect(Object.keys(s.players).length).toBe(0);
            expect(s.history).toHaveLength(0);
        });
    });

    describe('GameState.addPlayer', () => {
        it('should add a player to the state', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', 'builtin:2');
            expect(Object.keys(s.players).length).toBe(1);
            expect(s.players['peer-1'].nick).toBe('Gandalf');
            expect(s.players['peer-1'].connected).toBeTrue();
            expect(s.players['peer-1'].table).toHaveLength(0);
        });
    });

    describe('GameState.removePlayer', () => {
        it('should remove a player from the state', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);
            State.removePlayer(s, 'peer-1');
            expect(Object.keys(s.players).length).toBe(0);
        });
    });

    describe('GameState.disconnectPlayer', () => {
        it('should mark a player as disconnected', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);
            State.disconnectPlayer(s, 'peer-1');
            expect(s.players['peer-1'].connected).toBeFalse();
            expect(s.players['peer-1'].nick).toBe('Gandalf'); // data preserved
        });
    });

    describe('GameState.reconnectPlayer', () => {
        it('should reconnect a player with a new peer ID', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', 'builtin:2');
            State.disconnectPlayer(s, 'peer-1');

            const oldId = State.reconnectPlayer(s, 'peer-2', 'Gandalf', 'builtin:2');
            expect(oldId).toBe('peer-1');
            expect(s.players['peer-2']).toBeNotNull();
            expect(s.players['peer-2'].nick).toBe('Gandalf');
            expect(s.players['peer-2'].connected).toBeTrue();
            expect(s.players['peer-1']).toBe(undefined);
        });

        it('should return null if no matching disconnected player', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);
            // Player is still connected, won't match
            const oldId = State.reconnectPlayer(s, 'peer-2', 'Gandalf', null);
            expect(oldId).toBeNull();
        });
    });

    describe('GameState.addRoll', () => {
        it('should add a roll to player table and history', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);

            const roll = { dice: [{ sides: 20, count: 1, results: [17] }], total: 17, visibility: 'PUBLIC' };
            State.addRoll(s, 'peer-1', roll);

            expect(s.players['peer-1'].table).toHaveLength(1);
            expect(s.history).toHaveLength(1);
        });

        it('should merge dice into existing table entry on subsequent rolls', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);

            const roll1 = { dice: [{ sides: 20, count: 1, results: [17] }], total: 17, visibility: 'PUBLIC' };
            State.addRoll(s, 'peer-1', roll1);
            expect(s.players['peer-1'].table).toHaveLength(1);
            expect(s.players['peer-1'].table[0].total).toBe(17);

            const roll2 = { dice: [{ sides: 6, count: 2, results: [3, 5] }], total: 8, visibility: 'PUBLIC' };
            State.addRoll(s, 'peer-1', roll2);
            expect(s.players['peer-1'].table).toHaveLength(1); // still one entry
            expect(s.players['peer-1'].table[0].total).toBe(25); // 17 + 8
            expect(s.players['peer-1'].table[0].dice).toHaveLength(2); // two dice groups
            expect(s.history).toHaveLength(2); // history keeps individual rolls
        });

        it('should create new entry after table is cleared', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);

            const roll1 = { dice: [{ sides: 6, count: 1, results: [3] }], total: 3, visibility: 'PUBLIC' };
            State.addRoll(s, 'peer-1', roll1);
            expect(s.players['peer-1'].table).toHaveLength(1);

            // Clear table (simulates autoclear / CLEAR_MY_TABLE)
            State.clearTable(s, 'peer-1');
            expect(s.players['peer-1'].table).toHaveLength(0);

            const roll2 = { dice: [{ sides: 6, count: 1, results: [5] }], total: 5, visibility: 'PUBLIC' };
            State.addRoll(s, 'peer-1', roll2);
            expect(s.players['peer-1'].table).toHaveLength(1);
            expect(s.players['peer-1'].table[0].total).toBe(5); // fresh, not merged
            expect(s.history).toHaveLength(2); // history keeps all
        });
    });

    describe('GameState.clearTable', () => {
        it('should clear a specific player table', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);
            s.players['peer-1'].table.push({ total: 10 });
            State.clearTable(s, 'peer-1');
            expect(s.players['peer-1'].table).toHaveLength(0);
        });

        it('should clear all tables when peerId is null', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'A', null);
            State.addPlayer(s, 'peer-2', 'B', null);
            s.players['peer-1'].table.push({ total: 10 });
            s.players['peer-2'].table.push({ total: 5 });
            State.clearTable(s, null);
            expect(s.players['peer-1'].table).toHaveLength(0);
            expect(s.players['peer-2'].table).toHaveLength(0);
        });
    });

    describe('GameState.clearHistory', () => {
        it('should clear the history', () => {
            const s = State.create('room', 'DM', null);
            s.history.push({ total: 10 });
            s.history.push({ total: 5 });
            State.clearHistory(s);
            expect(s.history).toHaveLength(0);
        });
    });

    describe('GameState.toJSON / fromJSON', () => {
        it('should round-trip serialize correctly', () => {
            const s = State.create('room', 'DM', 'builtin:0');
            State.addPlayer(s, 'peer-1', 'Gandalf', 'builtin:2');
            s.history.push({ total: 17 });

            const json = State.toJSON(s);
            const restored = State.fromJSON(json);

            expect(restored.roomName).toBe('room');
            expect(restored.dmNick).toBe('DM');
            expect(Object.keys(restored.players).length).toBe(1);
            expect(restored.history).toHaveLength(1);
        });

        it('should handle string input', () => {
            const s = State.create('room', 'DM', null);
            const jsonStr = JSON.stringify(State.toJSON(s));
            const restored = State.fromJSON(jsonStr);
            expect(restored.roomName).toBe('room');
        });

        it('should return null for invalid input', () => {
            expect(State.fromJSON(null)).toBeNull();
            expect(State.fromJSON('not-json')).toBeNull();
            expect(State.fromJSON('{}')).toBeNull();
        });
    });

    describe('GameState.isRollVisibleTo', () => {
        it('should show PUBLIC rolls to everyone', () => {
            const roll = { visibility: 'PUBLIC', playerId: 'peer-1' };
            expect(State.isRollVisibleTo(roll, 'peer-2')).toBeTrue();
        });

        it('should show PRIVATE rolls only to the roller', () => {
            const roll = { visibility: 'PRIVATE', playerId: 'peer-1' };
            expect(State.isRollVisibleTo(roll, 'peer-1')).toBeTrue();
            expect(State.isRollVisibleTo(roll, 'peer-2')).toBeFalse();
        });

        it('should show TARGETED rolls to targets and the roller', () => {
            const roll = { visibility: 'TARGETED', playerId: 'peer-1', targets: ['peer-2'] };
            expect(State.isRollVisibleTo(roll, 'peer-1')).toBeTrue();
            expect(State.isRollVisibleTo(roll, 'peer-2')).toBeTrue();
            expect(State.isRollVisibleTo(roll, 'peer-3')).toBeFalse();
        });
    });

    describe('GameState.createPlayerView', () => {
        it('should filter out private rolls not visible to the viewer', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'A', null);
            State.addPlayer(s, 'peer-2', 'B', null);

            const publicRoll = { visibility: 'PUBLIC', playerId: 'peer-1', dice: [], total: 5 };
            const privateRoll = { visibility: 'PRIVATE', playerId: 'peer-2', dice: [], total: 10 };

            s.players['peer-1'].table.push(publicRoll);
            s.players['peer-2'].table.push(privateRoll);
            s.history.push(publicRoll, privateRoll);

            const view = State.createPlayerView(s, 'peer-1');
            // peer-1 should see public roll but not peer-2's private roll
            expect(view.players['peer-1'].table).toHaveLength(1);
            expect(view.players['peer-2'].table).toHaveLength(0);
            expect(view.history).toHaveLength(1);
        });
    });

    describe('GameState - history cap', () => {
        it('should cap history at MAX_HISTORY entries', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'A', null);

            for (let i = 0; i < State.MAX_HISTORY + 50; i++) {
                const roll = { dice: [{ sides: 6, count: 1, results: [3] }], total: 3, visibility: 'PUBLIC' };
                State.addRoll(s, 'peer-1', roll);
            }

            expect(s.history.length).toBeLessThanOrEqual(State.MAX_HISTORY);
        });

        it('should cap history via addDmRoll too', () => {
            const s = State.create('room', 'DM', null);

            for (let i = 0; i < State.MAX_HISTORY + 20; i++) {
                State.addDmRoll(s, { dice: [], total: 1 });
            }

            expect(s.history.length).toBeLessThanOrEqual(State.MAX_HISTORY);
        });
    });

    describe('GameState.addDmTableRoll', () => {
        it('should create a new DM table entry when empty', () => {
            const s = State.create('room', 'DM', null);
            const roll = { dice: [{ sides: 20, count: 1, results: [15] }], total: 15 };
            State.addDmTableRoll(s, roll, false);
            expect(s.dmTable).toHaveLength(1);
            expect(s.dmTable[0].total).toBe(15);
        });

        it('should merge rolls when autoclear is false', () => {
            const s = State.create('room', 'DM', null);
            const roll1 = { dice: [{ sides: 20, count: 1, results: [15] }], total: 15 };
            State.addDmTableRoll(s, roll1, false);

            const roll2 = { dice: [{ sides: 6, count: 2, results: [3, 4] }], total: 7 };
            State.addDmTableRoll(s, roll2, false);

            expect(s.dmTable).toHaveLength(1);
            expect(s.dmTable[0].total).toBe(22);
            expect(s.dmTable[0].dice).toHaveLength(2);
        });

        it('should replace table when autoclear is true', () => {
            const s = State.create('room', 'DM', null);
            const roll1 = { dice: [{ sides: 20, count: 1, results: [15] }], total: 15 };
            State.addDmTableRoll(s, roll1, false);

            const roll2 = { dice: [{ sides: 6, count: 1, results: [4] }], total: 4 };
            State.addDmTableRoll(s, roll2, true);

            expect(s.dmTable).toHaveLength(1);
            expect(s.dmTable[0].total).toBe(4);
            expect(s.dmTable[0].dice).toHaveLength(1);
        });
    });

    describe('GameState.clearDmTable', () => {
        it('should clear the DM table', () => {
            const s = State.create('room', 'DM', null);
            s.dmTable = [{ total: 10 }];
            State.clearDmTable(s);
            expect(s.dmTable).toHaveLength(0);
        });
    });

    describe('GameState.isNickTaken', () => {
        it('should return true if nick matches DM', () => {
            const s = State.create('room', 'DungeonMaster', null);
            expect(State.isNickTaken(s, 'DungeonMaster', null)).toBeTrue();
        });

        it('should return false if nick matches DM but excludePeerId is dm', () => {
            const s = State.create('room', 'DungeonMaster', null);
            expect(State.isNickTaken(s, 'DungeonMaster', 'dm')).toBeFalse();
        });

        it('should return true if nick matches connected player', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);
            expect(State.isNickTaken(s, 'Gandalf', 'peer-2')).toBeTrue();
        });

        it('should return false if nick matches disconnected player', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);
            State.disconnectPlayer(s, 'peer-1');
            expect(State.isNickTaken(s, 'Gandalf', 'peer-2')).toBeFalse();
        });

        it('should return false if excludePeerId matches the player', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);
            expect(State.isNickTaken(s, 'Gandalf', 'peer-1')).toBeFalse();
        });

        it('should return false for unique nick', () => {
            const s = State.create('room', 'DM', null);
            State.addPlayer(s, 'peer-1', 'Gandalf', null);
            expect(State.isNickTaken(s, 'Frodo', null)).toBeFalse();
        });
    });
})();
