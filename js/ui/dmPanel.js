/**
 * dmPanel.js — DM management panel for Dice Online.
 * 
 * Provides room management tools: kick players, clear tables, 
 * connection status, etc. Toggleable sidebar for the DM screen.
 */

const DmPanel = (() => {
    'use strict';

    /**
     * Initialize the DM management panel shell.
     */
    function init(container, options) {
        if (container._panelInitialized) return;

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

        // Room info container
        const roomInfo = document.createElement('div');
        roomInfo.className = 'dm-room-info';
        roomInfo.id = 'dm-room-info-container';
        container.appendChild(roomInfo);

        // Player list container
        const playerList = document.createElement('div');
        playerList.className = 'dm-player-list';

        const listTitle = document.createElement('h4');
        listTitle.textContent = 'Players';
        playerList.appendChild(listTitle);

        const playerListContent = document.createElement('div');
        playerListContent.id = 'dm-player-list-content';
        playerList.appendChild(playerListContent);

        container.appendChild(playerList);

        // Bulk actions
        const bulkActions = document.createElement('div');
        bulkActions.className = 'dm-bulk-actions';

        const clearAllBtn = document.createElement('button');
        clearAllBtn.type = 'button';
        clearAllBtn.className = 'btn btn-danger';
        clearAllBtn.textContent = '🗑️ Clear All Tables';
        clearAllBtn.addEventListener('click', () => {
            if (container._dmPanelOptions && container._dmPanelOptions.onClearTable) {
                container._dmPanelOptions.onClearTable(null);
            }
        });
        bulkActions.appendChild(clearAllBtn);

        const clearHistBtn = document.createElement('button');
        clearHistBtn.type = 'button';
        clearHistBtn.className = 'btn btn-danger';
        clearHistBtn.textContent = '📜 Clear History';
        clearHistBtn.addEventListener('click', () => {
            if (confirm('Clear all roll history?')) {
                if (container._dmPanelOptions && container._dmPanelOptions.onClearHistory) {
                    container._dmPanelOptions.onClearHistory();
                }
            }
        });
        bulkActions.appendChild(clearHistBtn);

        container.appendChild(bulkActions);

        container._panelInitialized = true;
    }

    /**
     * Update the dynamic parts of the DM panel.
     */
    function update(container, state, options) {
        container._dmPanelOptions = options; // store for callbacks

        // Update room info
        const infoContainer = container.querySelector('#dm-room-info-container');
        if (infoContainer) {
            const connectedCount = Object.values(state.players).filter(p => p.connected).length;
            const totalCount = Object.keys(state.players).length;
            const infoHTML = `
                <div class="info-row"><span class="info-label">Room:</span> <span class="info-value">${UIHelpers.escapeHTML(state.roomName)}</span></div>
                <div class="info-row"><span class="info-label">Players:</span> <span class="info-value">${connectedCount} / ${totalCount}</span></div>
            `;
            // Simple diffing to avoid needless repaints
            if (infoContainer._lastHTML !== infoHTML) {
                infoContainer.innerHTML = infoHTML;
                infoContainer._lastHTML = infoHTML;
            }
        }

        // Update player list
        const listContent = container.querySelector('#dm-player-list-content');
        if (!listContent) return;

        const players = Object.entries(state.players);

        if (players.length === 0) {
            // No players
            if (listContent.children.length !== 1 || !listContent.children[0].classList.contains('dm-no-players')) {
                listContent.innerHTML = '';
                const empty = document.createElement('div');
                empty.className = 'dm-no-players';
                empty.textContent = 'No players have joined yet.';
                listContent.appendChild(empty);
            }
            return;
        }

        // There are players. We'll reuse DOM elements where possible by peerId
        // Remove empty state message if present
        const emptyMsg = listContent.querySelector('.dm-no-players');
        if (emptyMsg) emptyMsg.remove();

        const existingRowsMap = new Map();
        Array.from(listContent.children).forEach(row => {
            if (row.dataset.peerId) {
                existingRowsMap.set(row.dataset.peerId, row);
            }
        });

        const fragment = document.createDocumentFragment();

        players.forEach(([peerId, player]) => {
            let row = existingRowsMap.get(peerId);

            if (!row) {
                // Create new row
                row = document.createElement('div');
                row.className = 'dm-player-row';
                row.dataset.peerId = peerId;

                const info = document.createElement('div');
                info.className = 'dm-player-info';

                const avatar = document.createElement('div');
                avatar.className = 'dm-player-avatar avatar-display-small';

                const name = document.createElement('span');
                name.className = 'dm-player-name';

                const statusDot = document.createElement('span');

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
                clearBtn.addEventListener('click', () => {
                    if (container._dmPanelOptions && container._dmPanelOptions.onClearTable) {
                        container._dmPanelOptions.onClearTable(peerId);
                    }
                });
                actions.appendChild(clearBtn);

                const kickBtn = document.createElement('button');
                kickBtn.type = 'button';
                kickBtn.className = 'btn btn-small btn-danger';
                kickBtn.textContent = '🚫';
                kickBtn.addEventListener('click', () => {
                    if (confirm(`Kick ${player.nick}?`)) {
                        if (container._dmPanelOptions && container._dmPanelOptions.onKick) {
                            container._dmPanelOptions.onKick(peerId);
                        }
                    }
                });
                actions.appendChild(kickBtn);

                row.appendChild(actions);
            } else {
                // Remove from map so we know it was visited
                existingRowsMap.delete(peerId);
            }

            // Update row view state
            if (!player.connected) {
                row.classList.add('disconnected');
            } else {
                row.classList.remove('disconnected');
            }

            // Update Avatar
            const avatarEl = row.querySelector('.dm-player-avatar');
            const avatarStr = JSON.stringify(player.avatarData);
            if (row._lastAvatarStr !== avatarStr) {
                AvatarPicker.renderAvatar(avatarEl, player.avatarData);
                row._lastAvatarStr = avatarStr;
            }

            // Update Name
            const nameEl = row.querySelector('.dm-player-name');
            nameEl.textContent = player.nick;

            // Update Status
            const statusDot = row.querySelector('.status-dot') || row.querySelector('span:nth-child(3)');
            statusDot.className = player.connected ? 'status-dot online' : 'status-dot offline';
            statusDot.title = player.connected ? 'Online' : 'Offline';

            // Update titles
            const clearBtn = row.querySelector('.btn-secondary');
            if (clearBtn) clearBtn.title = `Clear ${player.nick}'s table`;
            const kickBtn = row.querySelector('.btn-danger');
            if (kickBtn) kickBtn.title = `Kick ${player.nick}`;

            fragment.appendChild(row);
        });

        // Remove stale rows
        existingRowsMap.forEach(row => row.remove());

        if (fragment.children.length > 0) {
            listContent.appendChild(fragment);
        }
    }

    /**
     * Render entry point for backward compatibility.
     * Delegates to init/update.
     */
    function render(container, state, options) {
        init(container, options);
        update(container, state, options);
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

    return {
        render,
        createToggleButton,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DmPanel;
}
