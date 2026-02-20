/**
 * protocol.js — Message protocol definitions for Dice Online.
 * 
 * All communication between DM and players uses these message types.
 * Messages are plain JSON objects sent over PeerJS data channels.
 */

const Protocol = (() => {
    // Message types
    const MSG = Object.freeze({
        // Player → DM
        PLAYER_INFO: 'PLAYER_INFO',
        ROLL_REQUEST: 'ROLL_REQUEST',
        CLEAR_MY_TABLE: 'CLEAR_MY_TABLE',

        // DM → Player(s)
        ROLL_RESULT: 'ROLL_RESULT',
        STATE_SYNC: 'STATE_SYNC',
        PLAYER_JOINED: 'PLAYER_JOINED',
        PLAYER_LEFT: 'PLAYER_LEFT',
        PLAYER_KICKED: 'PLAYER_KICKED',
        TABLE_CLEARED: 'TABLE_CLEARED',
        HISTORY_CLEARED: 'HISTORY_CLEARED',
        PLAYER_LIST: 'PLAYER_LIST',
        AVATAR_UPDATE: 'AVATAR_UPDATE',
        NICK_TAKEN: 'NICK_TAKEN',

        // Bidirectional
        PING: 'PING',
        PONG: 'PONG',
    });

    // Visibility modes
    const VISIBILITY = Object.freeze({
        PUBLIC: 'PUBLIC',
        PRIVATE: 'PRIVATE',   // DM only (or self + DM for players)
        TARGETED: 'TARGETED',  // specific players + DM always
    });

    // --- Factory functions ---

    function createPlayerInfo(nick, avatarData) {
        return {
            type: MSG.PLAYER_INFO,
            nick,
            avatarData, // base64 string or built-in index (number)
        };
    }

    function createRollRequest(dice, visibility, targets) {
        // dice: [{sides: number, count: number}, ...]
        // visibility: VISIBILITY enum value
        // targets: [playerId, ...] (only for TARGETED)
        return {
            type: MSG.ROLL_REQUEST,
            dice,
            visibility: visibility || VISIBILITY.PUBLIC,
            targets: targets || [],
        };
    }

    function createRollResult(playerId, nick, dice, total, visibility, targets, timestamp) {
        // dice: [{sides, count, results: [int, ...]}, ...]
        return {
            type: MSG.ROLL_RESULT,
            playerId,
            nick,
            dice,
            total,
            visibility,
            targets: targets || [],
            timestamp: timestamp || Date.now(),
        };
    }

    function createStateSync(state) {
        return {
            type: MSG.STATE_SYNC,
            state,
        };
    }

    function createPlayerJoined(playerId, nick, avatarData) {
        return {
            type: MSG.PLAYER_JOINED,
            playerId,
            nick,
            avatarData,
        };
    }

    function createPlayerLeft(playerId, nick) {
        return {
            type: MSG.PLAYER_LEFT,
            playerId,
            nick,
        };
    }

    function createPlayerKicked(playerId, nick) {
        return {
            type: MSG.PLAYER_KICKED,
            playerId,
            nick,
        };
    }

    function createTableCleared(playerId) {
        return {
            type: MSG.TABLE_CLEARED,
            playerId, // null = all tables
        };
    }

    function createHistoryCleared() {
        return {
            type: MSG.HISTORY_CLEARED,
        };
    }

    function createPlayerList(players) {
        // players: [{id, nick, avatarData, connected}, ...]
        return {
            type: MSG.PLAYER_LIST,
            players,
        };
    }

    function createAvatarUpdate(playerId, nick, avatarData) {
        return {
            type: MSG.AVATAR_UPDATE,
            playerId,
            nick,
            avatarData,
        };
    }

    function createNickTaken(nick) {
        return {
            type: MSG.NICK_TAKEN,
            nick,
            message: `The nickname "${nick}" is already taken.`,
        };
    }

    // --- Validation ---

    function isValidMessage(msg) {
        if (!msg || typeof msg !== 'object') return false;
        if (!msg.type || !Object.values(MSG).includes(msg.type)) return false;
        return true;
    }

    function isValidDiceSpec(dice) {
        if (!Array.isArray(dice) || dice.length === 0) return false;
        return dice.every(d =>
            d && typeof d.sides === 'number' && d.sides >= 2 &&
            typeof d.count === 'number' && d.count >= 1 &&
            Number.isInteger(d.sides) && Number.isInteger(d.count)
        );
    }

    function isValidRollRequest(msg) {
        if (msg.type !== MSG.ROLL_REQUEST) return false;
        if (!isValidDiceSpec(msg.dice)) return false;
        if (!Object.values(VISIBILITY).includes(msg.visibility)) return false;
        return true;
    }

    // Public API
    return {
        MSG,
        VISIBILITY,
        createPlayerInfo,
        createRollRequest,
        createRollResult,
        createStateSync,
        createPlayerJoined,
        createPlayerLeft,
        createPlayerKicked,
        createTableCleared,
        createHistoryCleared,
        createPlayerList,
        createAvatarUpdate,
        createNickTaken,
        isValidMessage,
        isValidDiceSpec,
        isValidRollRequest,
    };
})();

// Export for Node.js tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Protocol;
}
