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

        // DM card
        const dmCard = createPlayerCard({
            nick: state.dmNick,
            avatarData: state.dmAvatar,
            table: state.dmTable || [],
            isDM: true,
            isMe: options.isDM,
            connected: true,
        }, options);
        container.appendChild(dmCard);

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
            container.appendChild(card);
        }

        // If DM, add "Clear All Tables" button
        if (options.isDM && Object.keys(state.players).length > 0) {
            const clearAllBtn = document.createElement('button');
            clearAllBtn.type = 'button';
            clearAllBtn.className = 'btn btn-small btn-danger clear-all-btn';
            clearAllBtn.textContent = '🗑️ Clear All Tables';
            clearAllBtn.addEventListener('click', () => {
                if (options.onClearTable) options.onClearTable(null);
            });
            container.appendChild(clearAllBtn);
        }
    }

    function createPlayerCard(playerData, options) {
        const card = document.createElement('div');
        card.className = 'player-card';
        if (!playerData.connected) card.classList.add('disconnected');
        if (playerData.isMe) card.classList.add('is-me');

        // Header: avatar + name
        const header = document.createElement('div');
        header.className = 'player-card-header';

        const avatar = document.createElement('div');
        avatar.className = 'player-avatar';
        AvatarPicker.renderAvatar(avatar, playerData.avatarData);

        const nameEl = document.createElement('div');
        nameEl.className = 'player-name';
        nameEl.textContent = playerData.nick;
        if (playerData.isDM) {
            const badge = document.createElement('span');
            badge.className = 'dm-badge';
            badge.textContent = 'DM';
            nameEl.appendChild(badge);
        }
        if (!playerData.connected) {
            const status = document.createElement('span');
            status.className = 'status-offline';
            status.textContent = ' (offline)';
            nameEl.appendChild(status);
        }

        header.appendChild(avatar);
        header.appendChild(nameEl);
        card.appendChild(header);

        // Table: dice results
        const tableEl = document.createElement('div');
        tableEl.className = 'player-table';

        if (playerData.table.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'table-empty';
            empty.textContent = 'No dice on table';
            tableEl.appendChild(empty);
        } else {
            playerData.table.forEach(roll => {
                const rollEl = createRollDisplay(roll);
                tableEl.appendChild(rollEl);
            });
        }

        card.appendChild(tableEl);

        // Clear table button
        if (playerData.isMe || options.isDM) {
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'btn btn-small btn-clear-table';
            clearBtn.textContent = '🧹 Clear';
            clearBtn.addEventListener('click', () => {
                if (options.onClearTable) options.onClearTable(playerData.peerId);
            });
            card.appendChild(clearBtn);
        }

        return card;
    }

    function createRollDisplay(roll) {
        const rollEl = document.createElement('div');
        rollEl.className = 'roll-display';

        // Visibility indicator
        if (roll.visibility !== 'PUBLIC') {
            const visIcon = document.createElement('span');
            visIcon.className = 'roll-visibility';
            visIcon.textContent = roll.visibility === 'PRIVATE' ? '🔒' : '🎯';
            visIcon.title = roll.visibility === 'PRIVATE' ? 'Private (DM only)' : 'Targeted';
            rollEl.appendChild(visIcon);
        }

        // Dice results
        const diceEl = document.createElement('div');
        diceEl.className = 'roll-dice';

        roll.dice.forEach(dieGroup => {
            const groupEl = document.createElement('span');
            groupEl.className = 'die-group';

            const labelEl = document.createElement('span');
            labelEl.className = 'die-group-label';
            labelEl.textContent = `${dieGroup.count}d${dieGroup.sides}: `;
            groupEl.appendChild(labelEl);

            dieGroup.results.forEach((result, i) => {
                if (i > 0) {
                    const sep = document.createElement('span');
                    sep.textContent = ', ';
                    groupEl.appendChild(sep);
                }

                const resultEl = document.createElement('span');
                resultEl.className = 'die-result';
                resultEl.textContent = result;

                // Critical highlighting
                if (Dice.isCriticalHit(result, dieGroup.sides)) {
                    resultEl.classList.add('critical-hit');
                } else if (Dice.isCriticalFail(result, dieGroup.sides)) {
                    resultEl.classList.add('critical-fail');
                }

                groupEl.appendChild(resultEl);
            });

            diceEl.appendChild(groupEl);
        });

        rollEl.appendChild(diceEl);

        // Total
        const totalEl = document.createElement('div');
        totalEl.className = 'roll-total';
        totalEl.textContent = `= ${roll.total}`;
        rollEl.appendChild(totalEl);

        return rollEl;
    }

    return {
        render,
        createRollDisplay,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerPool;
}
