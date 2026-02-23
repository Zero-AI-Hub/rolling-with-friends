/**
 * storage.js — localStorage persistence for Dice Online.
 * 
 * Saves and restores DM game state to survive page reloads.
 * Debounced to avoid excessive writes.
 */

const Storage = (() => {
    'use strict';
    const STORAGE_PREFIX = 'dice-online-';
    let saveTimeout = null;

    /**
     * Save game state to localStorage (debounced).
     * @param {string} roomName
     * @param {object} state - GameState object
     */
    function saveState(roomName, state) {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            try {
                const key = STORAGE_PREFIX + roomName;
                localStorage.setItem(key, JSON.stringify(state));
            } catch (e) {
                console.warn('Failed to save state to localStorage:', e);
            }
        }, 100);
    }

    /**
     * Save state immediately (no debounce). Use for critical saves.
     */
    function saveStateNow(roomName, state) {
        if (saveTimeout) clearTimeout(saveTimeout);
        try {
            const key = STORAGE_PREFIX + roomName;
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save state to localStorage:', e);
        }
    }

    /**
     * Load game state from localStorage.
     * @param {string} roomName
     * @returns {object|null} Parsed state, or null if not found/corrupt
     */
    function loadState(roomName) {
        try {
            const key = STORAGE_PREFIX + roomName;
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to load state from localStorage:', e);
            return null;
        }
    }

    /**
     * Clear saved state.
     * @param {string} roomName
     */
    function clearState(roomName) {
        try {
            const key = STORAGE_PREFIX + roomName;
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Failed to clear state from localStorage:', e);
        }
    }

    /**
     * Check if a saved state exists for a room.
     * @param {string} roomName
     * @returns {boolean}
     */
    function hasState(roomName) {
        const key = STORAGE_PREFIX + roomName;
        return localStorage.getItem(key) !== null;
    }

    return {
        saveState,
        saveStateNow,
        loadState,
        clearState,
        hasState,
        STORAGE_PREFIX,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
