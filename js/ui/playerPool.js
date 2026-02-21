/**
 * playerPool.js — Player card display component for Dice Online.
 * 
 * Shows all players in the room with their avatars, nicks, and
 * current dice on the table — including totals and critical highlights.
 */

const PlayerPool = (() => {
    /**
     * Render the player pool area.
     * @param {HTMLElement} container
     * @param {object} state - game state
     * @param {object} options
     *   - isDM: boolean
     *   - myPeerId: string (for highlighting own card)
     *   - onClearTable: function(peerId) — null for "clear all"
     */
    function render(container, state, options) {
        container.innerHTML = '';
        container.classList.add('player-pool');

        // Use DocumentFragment for batch DOM insertion
        const fragment = document.createDocumentFragment();

        // DM card
        const dmCard = createPlayerCard({
            peerId: 'dm',
            nick: state.dmNick,
            avatarData: state.dmAvatar,
            table: state.dmTable || [],
            isDM: true,
            isMe: options.isDM,
            connected: true,
        }, options);
        fragment.appendChild(dmCard);

        // Player cards
        for (const [peerId, player] of Object.entries(state.players)) {
            const card = createPlayerCard({
                peerId,
                nick: player.nick,
                avatarData: player.avatarData,
                table: player.table || [],
                isDM: false,
                isMe: peerId === options.myPeerId,
                connected: player.connected,
                autoclear: player.autoclear,
            }, options);
            fragment.appendChild(card);
        }

        container.appendChild(fragment);
    }

    function createPlayerCard(playerData, options) {
        const card = document.createElement('div');
        const cardClass = `player-card ${!playerData.connected ? 'disconnected' : ''} ${playerData.isMe ? 'is-me' : ''}`.trim();
        card.className = cardClass;

        const { escapeHTML } = UIHelpers;
        const nickSafe = escapeHTML(playerData.nick);
        const dmBadge = playerData.isDM ? `<span class="dm-badge">DM</span>` : '';
        const offlineBadge = !playerData.connected ? `<span class="status-offline"> (offline)</span>` : '';

        let rollsHTML = '';
        if (playerData.table.length === 0) {
            rollsHTML = `<div class="table-empty">No dice on table</div>`;
        } else {
            rollsHTML = playerData.table.map(r => createRollDisplayHTML(r)).join('');
        }

        let clearBtnHTML = '';
        if (playerData.isMe || options.isDM) {
            clearBtnHTML = `<button type="button" class="btn btn-small btn-clear-table">🧹 Clear</button>`;
        }

        card.innerHTML = `
            <div class="player-card-header">
                <div class="player-avatar"></div>
                <div class="player-name">${nickSafe}${dmBadge}${offlineBadge}</div>
            </div>
            <div class="player-table">
                ${rollsHTML}
            </div>
            ${clearBtnHTML}
        `;

        // Render avatar using the existing function on the generated element
        const avatarEl = card.querySelector('.player-avatar');
        AvatarPicker.renderAvatar(avatarEl, playerData.avatarData);

        if (playerData.isMe || options.isDM) {
            const clearBtnEl = card.querySelector('.btn-clear-table');
            clearBtnEl.addEventListener('click', () => {
                if (options.onClearTable) options.onClearTable(playerData.peerId);
            });
        }

        return card;
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
