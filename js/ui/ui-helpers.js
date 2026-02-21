/**
 * ui-helpers.js — Shared UI helper functions for Dice Online.
 *
 * Provides common utilities used by both dm.html and player.html:
 * status indicator, connection banners, sound toggle, and panel toolbar setup.
 */

const UIHelpers = (() => {
    /**
     * Update the connection status indicator.
     * @param {HTMLElement} dotEl - The status dot element
     * @param {HTMLElement} textEl - The status text element
     * @param {string} statusState - CSS class: 'online', 'offline'
     * @param {string} text - Display text
     */
    function setStatus(dotEl, textEl, statusState, text) {
        dotEl.className = `status-dot ${statusState}`;
        textEl.textContent = text;
    }

    /**
     * Show the connection banner with a message.
     * @param {HTMLElement} bannerEl
     * @param {string} text
     * @param {string} type - CSS class: 'connecting', 'error', 'recovering'
     */
    function showBanner(bannerEl, text, type) {
        bannerEl.textContent = text;
        bannerEl.className = `connection-banner ${type}`;
    }

    /**
     * Hide the connection banner.
     * @param {HTMLElement} bannerEl
     */
    function hideBanner(bannerEl) {
        bannerEl.classList.add('hidden');
    }

    /**
     * Set up the sound toggle button.
     * @param {HTMLElement} soundToggleEl
     */
    function setupSoundToggle(soundToggleEl) {
        soundToggleEl.addEventListener('click', () => {
            Sound.init();
            const muted = Sound.toggleMute();
            soundToggleEl.textContent = muted ? '🔇' : '🔊';
        });
        // Init sound on first user interaction
        document.addEventListener('click', () => Sound.init(), { once: true });
    }

    /**
     * Create a panel toolbar with toggle buttons and insert it into the header.
     * @param {HTMLElement} headerActionsEl - The .game-header-actions element
     * @param {Array<HTMLElement>} toggleButtons - Toggle button elements to add
     */
    function setupPanelToolbar(headerActionsEl, toggleButtons) {
        const toolbar = document.createElement('div');
        toolbar.className = 'panel-toolbar';
        toggleButtons.forEach(btn => toolbar.appendChild(btn));
        headerActionsEl.prepend(toolbar);
    }

    /**
     * Create a throttled render function using requestAnimationFrame.
     * Coalesces multiple calls into a single render pass.
     * @param {function} renderFn - The render function to throttle
     * @returns {function} Throttled render function
     */
    function createThrottledRender(renderFn) {
        let rafId = null;
        return function throttledRender() {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                renderFn();
            });
        };
    }

    /**
     * Escape HTML characters to prevent XSS.
     * @param {string} str - The string to escape
     * @returns {string} Escaped string
     */
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    return {
        setStatus,
        showBanner,
        hideBanner,
        setupSoundToggle,
        setupPanelToolbar,
        createThrottledRender,
        escapeHTML,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIHelpers;
}
