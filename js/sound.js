/**
 * sound.js — Sound effects for Dice Online.
 * 
 * Plays a dice rolling sound when dice are thrown.
 * Uses a small .mp3 file from the sfx/ directory.
 */

const Sound = (() => {
    'use strict';
    let audioContext = null;
    let diceBuffer = null;
    let loaded = false;
    let muted = false;

    /**
     * Initialize the sound system.
     * Must be called in response to a user gesture (click) to comply
     * with browser autoplay policies.
     */
    async function init() {
        if (audioContext) return;
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const response = await fetch('sfx/dice-roll.mp3');
            const arrayBuffer = await response.arrayBuffer();
            diceBuffer = await audioContext.decodeAudioData(arrayBuffer);
            loaded = true;
        } catch (e) {
            console.warn('Failed to load dice sound:', e);
        }
    }

    /**
     * Play the dice rolling sound.
     */
    function playDiceRoll() {
        if (!loaded || muted || !audioContext || !diceBuffer) return;
        try {
            // Resume context if suspended (autoplay policy)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            const source = audioContext.createBufferSource();
            source.buffer = diceBuffer;

            // Add slight pitch variation for variety
            source.playbackRate.value = 0.9 + Math.random() * 0.2;

            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0.5;

            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            source.start(0);
        } catch (e) {
            console.warn('Failed to play dice sound:', e);
        }
    }

    /**
     * Toggle mute.
     */
    function toggleMute() {
        muted = !muted;
        return muted;
    }

    function isMuted() {
        return muted;
    }

    return {
        init,
        playDiceRoll,
        toggleMute,
        isMuted,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sound;
}
