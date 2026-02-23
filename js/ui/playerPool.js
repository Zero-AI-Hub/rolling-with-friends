/**
 * playerPool.js — Player card display component for Dice Online.
 * 
 * Shows all players in the room with their avatars, nicks, and
 * current dice on the table — including totals and critical highlights.
 */

const PlayerPool = (() => {
    'use strict';

    /**
     * Initialize the player pool container
     */
    function init(container) {
        if (container._poolInitialized) return;

        container.innerHTML = '';
        container.classList.add('player-pool');
        container._poolInitialized = true;
    }

    /**
     * Update the player pool area without destroying existing cards.
     * @param {HTMLElement} container
     * @param {object} state - game state
     * @param {object} options
     *   - isDM: boolean
     *   - myPeerId: string (for highlighting own card)
     *   - onClearTable: function(peerId) — null for "clear all"
     */
    function update(container, state, options) {
        // Collect all target data we need to render
        const targets = new Map();

        // DM card data
        targets.set('dm', {
            peerId: 'dm',
            nick: state.dmNick,
            avatarData: state.dmAvatar,
            table: state.dmTable || [],
            isDM: true,
            isMe: options.isDM,
            connected: true,
        });

        // Player cards data
        for (const [peerId, player] of Object.entries(state.players)) {
            targets.set(peerId, {
                peerId,
                nick: player.nick,
                avatarData: player.avatarData,
                table: player.table || [],
                isDM: false,
                isMe: peerId === options.myPeerId,
                connected: player.connected,
                autoclear: player.autoclear,
            });
        }

        // Remove cards that are no longer in the state
        const currentCards = Array.from(container.children);
        currentCards.forEach(card => {
            const peerId = card.dataset.peerId;
            if (!targets.has(peerId)) {
                card.remove();
            }
        });

        // Add or update cards
        // Use DocumentFragment for appending new ones to minimize reflows
        const fragment = document.createDocumentFragment();

        // Ensure DM is always first
        const dmData = targets.get('dm');
        updateOrCreateCard(container, fragment, dmData, options);
        targets.delete('dm');

        // Then rest of players
        for (const playerData of targets.values()) {
            updateOrCreateCard(container, fragment, playerData, options);
        }

        if (fragment.children.length > 0) {
            container.appendChild(fragment);
        }
    }

    function updateOrCreateCard(container, fragment, playerData, options) {
        let card = container.querySelector(`.player-card[data-peer-id="${playerData.peerId}"]`);

        if (!card) {
            // Create new
            card = document.createElement('div');
            card.dataset.peerId = playerData.peerId;
            card.className = 'player-card';

            card.innerHTML = `
                <div class="player-card-header">
                    <div class="player-avatar"></div>
                    <div class="player-name"></div>
                </div>
                <div class="player-table"></div>
                <button type="button" class="btn btn-small btn-clear-table hidden">🧹 Clear</button>
            `;

            // Clear button listener (only attached once)
            const clearBtnEl = card.querySelector('.btn-clear-table');
            clearBtnEl.addEventListener('click', () => {
                if (options.onClearTable) options.onClearTable(playerData.peerId);
            });

            fragment.appendChild(card);
        }

        // Update classes
        const classList = ['player-card'];
        if (!playerData.connected) classList.push('disconnected');
        if (playerData.isMe) classList.push('is-me');
        card.className = classList.join(' ');

        // Update Content
        const { escapeHTML } = UIHelpers;
        const nickSafe = escapeHTML(playerData.nick);
        const dmBadge = playerData.isDM ? `<span class="dm-badge">DM</span>` : '';
        const offlineBadge = !playerData.connected ? `<span class="status-offline"> (offline)</span>` : '';

        const nameEl = card.querySelector('.player-name');
        nameEl.innerHTML = `${nickSafe}${dmBadge}${offlineBadge}`;

        // Update Avatar
        const avatarEl = card.querySelector('.player-avatar');
        // Simple diff check for avatar to avoid rebuilding if identical
        const avatarStr = JSON.stringify(playerData.avatarData);
        if (card._lastAvatarStr !== avatarStr) {
            AvatarPicker.renderAvatar(avatarEl, playerData.avatarData);
            card._lastAvatarStr = avatarStr;
        }

        // Update Rolls
        const tableEl = card.querySelector('.player-table');
        let rollsHTML = '';
        if (playerData.table.length === 0) {
            rollsHTML = `<div class="table-empty">No dice on table</div>`;
        } else {
            rollsHTML = playerData.table.map(r => createRollDisplayHTML(r)).join('');
        }

        if (card._lastRollsHTML !== rollsHTML) {
            tableEl.innerHTML = rollsHTML;
            card._lastRollsHTML = rollsHTML;
        }

        // Update Clear Button Visibility
        const clearBtnEl = card.querySelector('.btn-clear-table');
        if (playerData.isMe || options.isDM) {
            clearBtnEl.classList.remove('hidden');
        } else {
            clearBtnEl.classList.add('hidden');
        }
    }

    /**
     * Render entry point for backward compatibility.
     * Delegates to init/update.
     */
    function render(container, state, options) {
        init(container);
        update(container, state, options);
    }

    function createRollDisplayHTML(roll) {
        const { escapeHTML } = UIHelpers;

        let visIconHTML = '';
        if (roll.visibility !== 'PUBLIC') {
            const icon = roll.visibility === 'PRIVATE' ? '🔒' : '🎯';
            const title = roll.visibility === 'PRIVATE' ? 'Private (DM only)' : 'Targeted';
            visIconHTML = `<span class="roll-visibility" title="${escapeHTML(title)}">${icon}</span>`;
        }

        const diceGroupsHTML = roll.dice.map(dieGroup => {
            const resultsHTML = dieGroup.results.map((result, i) => {
                let classes = 'die-result';
                if (Dice.isCriticalHit(result, dieGroup.sides)) classes += ' critical-hit';
                else if (Dice.isCriticalFail(result)) classes += ' critical-fail';

                const prefix = i > 0 ? '<span>, </span>' : '';
                return `${prefix}<span class="${classes}">${result}</span>`;
            }).join('');

            return `
                <span class="die-group">
                    <span class="die-group-label">${dieGroup.count}d${dieGroup.sides}: </span>
                    ${resultsHTML}
                </span>
            `;
        }).join('');

        return `
            <div class="roll-display">
                ${visIconHTML}
                <div class="roll-dice">
                    ${diceGroupsHTML}
                </div>
                <div class="roll-total">= ${roll.total}</div>
            </div>
        `;
    }

    return {
        render,
        createRollDisplayHTML,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerPool;
}
