/**
 * state.js — Game state management for Dice Online.
 * 
 * Central state object that holds all room data.
 * Used by the DM as the authoritative state, and by players
 * as a local mirror (synced via STATE_SYNC messages).
 */

const GameState = (() => {
    'use strict';

    const MAX_HISTORY = 500;
    /**
     * Create a new empty game state.
     * @param {string} roomName
     * @param {string} dmNick
     * @param {*} dmAvatar - avatar data (index or base64)
     * @returns {object} state
     */
    function create(roomName, dmNick, dmAvatar) {
        return {
            roomName,
            dmNick,
            dmAvatar,
            dmPeerId: null,
            dmTable: [],  // DM's own dice table
            players: {},   // { peerId: { nick, avatarData, connected, table: [], autoclear: false } }
            history: [],   // [{ playerId, nick, dice, total, visibility, targets, timestamp }]
            settings: {
                critHit: 20,
                critFail: 1,
                autoclearSeconds: 0, // 0 = disabled
                forceAutoclear: false,
                notifyHidden: false,
            },
            createdAt: Date.now(),
        };
    }

    /**
     * Add a player to the state.
     */
    function addPlayer(state, peerId, nick, avatarData) {
        state.players[peerId] = {
            nick,
            avatarData,
            connected: true,
            table: [],
            autoclear: false,
        };
        return state;
    }

    /**
     * Remove a player from the state entirely.
     */
    function removePlayer(state, peerId) {
        delete state.players[peerId];
        return state;
    }

    /**
     * Mark a player as disconnected (but keep their data for reconnection).
     */
    function disconnectPlayer(state, peerId) {
        if (state.players[peerId]) {
            state.players[peerId].connected = false;
        }
        return state;
    }

    /**
     * Reconnect a player — find by nick and update their peer ID.
     * Returns the old peerId if found, or null.
     */
    function reconnectPlayer(state, newPeerId, nick, avatarData) {
        // Find existing player with same nick
        for (const [oldPeerId, player] of Object.entries(state.players)) {
            if (player.nick === nick && !player.connected) {
                // Move data to new peer ID
                const playerData = { ...player, connected: true, avatarData: avatarData || player.avatarData };
                delete state.players[oldPeerId];
                state.players[newPeerId] = playerData;
                return oldPeerId;
            }
        }
        return null;
    }

    /**
     * Add a roll result to a player's table and to history.
     * If the table already has a roll, merges dice into it (append dice, update total).
     * Table clearing is handled client-side via CLEAR_MY_TABLE before rolling.
     */
    function addRoll(state, peerId, rollResult) {
        const player = state.players[peerId];
        if (!player) return state;

        // Always record individual roll in history (capped)
        state.history.push(rollResult);
        if (state.history.length > MAX_HISTORY) {
            state.history = state.history.slice(-MAX_HISTORY);
        }

        // Merge into existing table entry, or create new if empty
        if (player.table.length > 0) {
            const existing = player.table[0];
            existing.dice = existing.dice.concat(rollResult.dice);
            existing.total += rollResult.total;
            existing.timestamp = rollResult.timestamp || Date.now();
        } else {
            player.table = [{ ...rollResult, dice: rollResult.dice.slice() }];
        }

        return state;
    }

    /**
     * Add a DM roll to history (DM doesn't have a player entry, handle separately).
     */
    function addDmRoll(state, rollResult) {
        state.history.push(rollResult);
        if (state.history.length > MAX_HISTORY) {
            state.history = state.history.slice(-MAX_HISTORY);
        }
        return state;
    }

    /**
     * Add a DM roll to the DM's table (with optional autoclear).
     */
    function addDmTableRoll(state, rollResult, autoclear) {
        if (autoclear || state.dmTable.length === 0) {
            if (autoclear) {
                state.dmTable = [];
            }
            state.dmTable = [{ ...rollResult, dice: rollResult.dice.slice() }];
        } else {
            const existing = state.dmTable[0];
            existing.dice = existing.dice.concat(rollResult.dice);
            existing.total += rollResult.total;
            existing.timestamp = rollResult.timestamp || Date.now();
        }
        return state;
    }

    /**
     * Clear the DM's table.
     */
    function clearDmTable(state) {
        state.dmTable = [];
        return state;
    }

    /**
     * Clear a specific player's table.
     */
    function clearTable(state, peerId) {
        if (peerId === null || peerId === undefined) {
            // Clear all tables
            for (const player of Object.values(state.players)) {
                player.table = [];
            }
        } else if (state.players[peerId]) {
            state.players[peerId].table = [];
        }
        return state;
    }

    /**
     * Update a player's (or DM's) profile details.
     */
    function updatePlayerProfile(state, peerId, nick, avatarData) {
        if (peerId === 'dm') {
            state.dmNick = nick;
            state.dmAvatar = avatarData;
        } else if (state.players[peerId]) {
            state.players[peerId].nick = nick;
            state.players[peerId].avatarData = avatarData;
        }
        return state;
    }

    /**
     * Update DM settings in state.
     */
    function updateSettings(state, settingsUpdate) {
        state.settings = { ...state.settings, ...settingsUpdate };
        return state;
    }

    /**
     * Clear the roll history.
     */
    function clearHistory(state) {
        state.history = [];
        return state;
    }

    /**
     * Check if a nickname is already taken in the room.
     * @param {object} state
     * @param {string} nick
     * @param {string|null} excludePeerId — peer ID to exclude (for self-updates)
     * @returns {boolean}
     */
    function isNickTaken(state, nick, excludePeerId) {
        // Check DM nick
        if (nick === state.dmNick && excludePeerId !== 'dm') return true;
        // Check connected players
        for (const [id, player] of Object.entries(state.players)) {
            if (player.nick === nick && player.connected && id !== excludePeerId) {
                return true;
            }
        }
        return false;
    }

    /**
     * Set autoclear for a player.
     */
    function setAutoclear(state, peerId, enabled) {
        if (state.players[peerId]) {
            state.players[peerId].autoclear = enabled;
        }
        return state;
    }

    /**
     * Get a list of connected players (for the player list).
     */
    function getPlayerList(state) {
        return Object.entries(state.players).map(([id, p]) => ({
            id,
            nick: p.nick,
            avatarData: p.avatarData,
            connected: p.connected,
        }));
    }

    /**
     * Serialize state to JSON (for localStorage / STATE_SYNC).
     */
    function toJSON(state) {
        if (typeof structuredClone === 'function') {
            return structuredClone(state);
        }
        return JSON.parse(JSON.stringify(state));
    }

    /**
     * Deserialize state from JSON.
     */
    function fromJSON(json) {
        if (typeof json === 'string') {
            try {
                json = JSON.parse(json);
            } catch (e) {
                return null;
            }
        }
        if (!json || !json.roomName) return null;

        // Ensure all expected fields exist
        return {
            roomName: json.roomName,
            dmNick: json.dmNick || 'DM',
            dmAvatar: json.dmAvatar || null,
            dmPeerId: json.dmPeerId || null,
            dmTable: json.dmTable || [],
            players: json.players || {},
            history: json.history || [],
            settings: json.settings || {
                critHit: 20,
                critFail: 1,
                autoclearSeconds: 0,
                forceAutoclear: false,
                notifyHidden: false,
            },
            createdAt: json.createdAt || Date.now(),
        };
    }

    /**
     * Create a sanitized state for sending to a specific player.
     * Filters out private rolls that the player shouldn't see.
     */
    function createPlayerView(state, viewerPeerId) {
        const view = toJSON(state);

        // Filter each player's table to only show visible rolls
        for (const [peerId, player] of Object.entries(view.players)) {
            player.table = player.table.filter(roll =>
                isRollVisibleTo(roll, viewerPeerId)
            );
        }

        // Filter history similarly
        view.history = view.history.filter(roll =>
            isRollVisibleTo(roll, viewerPeerId)
        );

        return view;
    }

    /**
     * Check if a roll is visible to a given viewer.
     */
    function isRollVisibleTo(roll, viewerPeerId) {
        if (roll.visibility === 'PUBLIC') return true;
        if (roll.playerId === viewerPeerId) return true;
        if (roll.visibility === 'TARGETED' && roll.targets && roll.targets.includes(viewerPeerId)) return true;
        return false;
    }

    return {
        MAX_HISTORY,
        create,
        addPlayer,
        removePlayer,
        disconnectPlayer,
        reconnectPlayer,
        addRoll,
        addDmRoll,
        addDmTableRoll,
        clearDmTable,
        clearTable,
        clearHistory,
        isNickTaken,
        setAutoclear,
        getPlayerList,
        toJSON,
        fromJSON,
        createPlayerView,
        isRollVisibleTo,
        updatePlayerProfile,
        updateSettings,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameState;
}
