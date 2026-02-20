/**
 * dmPanel.js — DM management panel for Dice Online.
 * 
 * Provides room management tools: kick players, clear tables, 
 * connection status, etc. Toggleable sidebar for the DM screen.
 */

const DmPanel = (() => {
    /**
     * Render the DM management panel.
     * @param {HTMLElement} container
     * @param {object} state - game state
     * @param {object} options
     *   - onKick: function(peerId)
     *   - onClearTable: function(peerId) — null for all
     *   - onClearHistory: function()
     */
    function render(container, state, options) {
        container.innerHTML = '';
        container.classList.add('dm-panel');

        const header = document.createElement('div');
        header.className = 'panel-header';
        const title = document.createElement('h3');
        title.textContent = '⚙️ Room Management';
        header.appendChild(title);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn btn-small panel-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.title = 'Close panel';
        closeBtn.addEventListener('click', () => {
            container.classList.remove('panel-open');
            if (container._toggleBtn) container._toggleBtn.classList.remove('active');
        });
        header.appendChild(closeBtn);

        container.appendChild(header);

        // Room info
        const roomInfo = document.createElement('div');
        roomInfo.className = 'dm-room-info';
        roomInfo.innerHTML = `
            <div class="info-row"><span class="info-label">Room:</span> <span class="info-value">${escapeHtml(state.roomName)}</span></div>
            <div class="info-row"><span class="info-label">Players:</span> <span class="info-value">${Object.values(state.players).filter(p => p.connected).length} / ${Object.keys(state.players).length}</span></div>
        `;
        container.appendChild(roomInfo);

        // Player list
        const playerList = document.createElement('div');
        playerList.className = 'dm-player-list';

        const listTitle = document.createElement('h4');
        listTitle.textContent = 'Players';
        playerList.appendChild(listTitle);

        const players = Object.entries(state.players);
        if (players.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'dm-no-players';
            empty.textContent = 'No players have joined yet.';
            playerList.appendChild(empty);
        } else {
            players.forEach(([peerId, player]) => {
                const row = document.createElement('div');
                row.className = 'dm-player-row';
                if (!player.connected) row.classList.add('disconnected');

                const info = document.createElement('div');
                info.className = 'dm-player-info';

                const avatar = document.createElement('div');
                avatar.className = 'dm-player-avatar avatar-display-small';
                AvatarPicker.renderAvatar(avatar, player.avatarData);

                const name = document.createElement('span');
                name.className = 'dm-player-name';
                name.textContent = player.nick;

                const statusDot = document.createElement('span');
                statusDot.className = player.connected ? 'status-dot online' : 'status-dot offline';
                statusDot.title = player.connected ? 'Online' : 'Offline';

                info.appendChild(avatar);
                info.appendChild(name);
                info.appendChild(statusDot);
                row.appendChild(info);

                const actions = document.createElement('div');
                actions.className = 'dm-player-actions';

                const clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.className = 'btn btn-small btn-secondary';
                clearBtn.textContent = '🧹';
                clearBtn.title = `Clear ${player.nick}'s table`;
                clearBtn.addEventListener('click', () => {
                    if (options.onClearTable) options.onClearTable(peerId);
                });
                actions.appendChild(clearBtn);

                const kickBtn = document.createElement('button');
                kickBtn.type = 'button';
                kickBtn.className = 'btn btn-small btn-danger';
                kickBtn.textContent = '🚫';
                kickBtn.title = `Kick ${player.nick}`;
                kickBtn.addEventListener('click', () => {
                    if (confirm(`Kick ${player.nick}?`)) {
                        if (options.onKick) options.onKick(peerId);
                    }
                });
                actions.appendChild(kickBtn);

                row.appendChild(actions);
                playerList.appendChild(row);
            });
        }

        container.appendChild(playerList);

        // Bulk actions
        const bulkActions = document.createElement('div');
        bulkActions.className = 'dm-bulk-actions';

        const clearAllBtn = document.createElement('button');
        clearAllBtn.type = 'button';
        clearAllBtn.className = 'btn btn-danger';
        clearAllBtn.textContent = '🗑️ Clear All Tables';
        clearAllBtn.addEventListener('click', () => {
            if (options.onClearTable) options.onClearTable(null);
        });
        bulkActions.appendChild(clearAllBtn);

        const clearHistBtn = document.createElement('button');
        clearHistBtn.type = 'button';
        clearHistBtn.className = 'btn btn-danger';
        clearHistBtn.textContent = '📜 Clear History';
        clearHistBtn.addEventListener('click', () => {
            if (confirm('Clear all roll history?')) {
                if (options.onClearHistory) options.onClearHistory();
            }
        });
        bulkActions.appendChild(clearHistBtn);

        container.appendChild(bulkActions);
    }

    /**
     * Create the toggle button for the DM panel.
     */
    function createToggleButton(panelElement) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-toggle-panel btn-dm-toggle';
        btn.title = 'Toggle room management';
        btn.textContent = '⚙️';
        btn.id = 'dm-toggle';

        btn.addEventListener('click', () => {
            panelElement.classList.toggle('panel-open');
            btn.classList.toggle('active');
        });

        // Store reference so close buttons inside the panel can use it
        panelElement._toggleBtn = btn;

        return btn;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return {
        render,
        createToggleButton,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DmPanel;
}
