// --- DM Page Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem('dice-online-session') || '{}');
    const roomName = session.room;
    const dmNick = session.nick || 'DM';
    const dmAvatar = session.avatar || 'builtin:0';

    if (!roomName) {
        window.location.href = 'index.html';
        return;
    }

    // Clean URL (remove any leftover params)
    if (window.location.search) {
        history.replaceState(null, '', window.location.pathname);
    }

    // UI references
    const headerRoom = document.getElementById('header-room');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const playerPoolEl = document.getElementById('player-pool');
    const diceRollerEl = document.getElementById('dice-roller');
    const historyPanelEl = document.getElementById('history-panel');
    const dmPanelEl = document.getElementById('dm-panel');
    const connectionBanner = document.getElementById('connection-banner');
    const soundToggle = document.getElementById('sound-toggle');

    headerRoom.textContent = `Room: ${roomName}`;

    // --- Helpers (delegating to UIHelpers) ---
    function setStatus(statusState, text) {
        UIHelpers.setStatus(statusDot, statusText, statusState, text);
    }

    function showBanner(text, type) {
        UIHelpers.showBanner(connectionBanner, text, type);
    }

    function hideBanner() {
        UIHelpers.hideBanner(connectionBanner);
    }

    // --- Session Restore Modal ---
    function showRestoreModal(playerCount) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-card">
                    <div class="modal-icon">📜</div>
                    <div class="modal-title">Previous Session Found</div>
                    <div class="modal-body">
                        A saved session for <strong>${roomName}</strong> was found
                        with <strong>${playerCount}</strong> player(s).<br>
                        Would you like to restore it?
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="modal-new">🗑️ Start Fresh</button>
                        <button class="btn btn-accent" id="modal-restore">✅ Restore</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#modal-restore').addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });
            overlay.querySelector('#modal-new').addEventListener('click', () => {
                overlay.remove();
                resolve(false);
            });
        });
    }

    // --- State ---
    let state;
    let dmAutoclear = true; // Default: replace rolls

    async function initSession() {
        const savedState = Storage.loadState(roomName);
        if (savedState && savedState.roomName === roomName) {
            const playerCount = Object.keys(savedState.players || {}).length;
            const shouldRestore = await showRestoreModal(playerCount);
            if (shouldRestore) {
                state = GameState.fromJSON(savedState);
                for (const p of Object.values(state.players)) {
                    p.connected = false;
                }
                state.dmNick = dmNick;
                state.dmAvatar = dmAvatar;
                showBanner('Restoring previous session...', 'recovering');
                setTimeout(() => hideBanner(), 3000);
            } else {
                state = GameState.create(roomName, dmNick, dmAvatar);
                Storage.clearState(roomName);
            }
        } else {
            state = GameState.create(roomName, dmNick, dmAvatar);
        }

        // DM's own table for dice rolls
        if (!state.dmTable) state.dmTable = [];

        startGame();
    }

    function startGame() {
        // --- Connection ---
        const host = Connection.createHost(roomName, {
            onOpen: (id) => {
                state.dmPeerId = id;
                setStatus('online', 'Connected');
                Storage.saveState(roomName, state);
                renderAll();
            },
            onPlayerConnected: (peerId) => {
                // Wait for PLAYER_INFO message
                console.log('[DM] Awaiting player info from:', peerId);
            },
            onPlayerDisconnected: (peerId) => {
                const player = state.players[peerId];
                if (player) {
                    console.log(`[DM] Player disconnected: ${player.nick}`);
                    GameState.removePlayer(state, peerId);
                    Storage.saveState(roomName, state);
                    host.broadcast(Protocol.createPlayerLeft(peerId, player.nick));
                    broadcastPlayerList();
                    renderAll();
                }
            },
            onMessage: (peerId, msg) => {
                handleMessage(peerId, msg);
            },
            onError: (err) => {
                console.error('[DM] Error:', err);
                setStatus('offline', 'Error');
                showBanner(err.message || 'Connection error', 'error');
            },
        });

        host.start();

        // --- Message Handling ---
        function handleMessage(peerId, msg) {
            if (!Protocol.isValidMessage(msg)) return;

            switch (msg.type) {
                case Protocol.MSG.PLAYER_INFO:
                    handlePlayerInfo(peerId, msg);
                    break;
                case Protocol.MSG.ROLL_REQUEST:
                    handleRollRequest(peerId, msg);
                    break;
                case Protocol.MSG.CLEAR_MY_TABLE:
                    handleClearMyTable(peerId);
                    break;
                case Protocol.MSG.UPDATE_PROFILE:
                    handleUpdateProfile(peerId, msg);
                    break;
                default:
                    console.warn('[DM] Unknown message type:', msg.type);
            }
        }

        function handlePlayerInfo(peerId, msg) {
            const nick = msg.nick || 'Player';
            const avatarData = msg.avatarData;

            // Enforce unique nicknames: reject if a connected player has the same nick
            for (const [existingId, existingPlayer] of Object.entries(state.players)) {
                if (existingPlayer.nick === nick && existingPlayer.connected && existingId !== peerId) {
                    console.log(`[DM] Rejected player: nick "${nick}" already taken by ${existingId}`);
                    host.sendTo(peerId, Protocol.createNickTaken(nick));
                    return;
                }
            }
            // Also check against DM nick
            if (nick === dmNick) {
                console.log(`[DM] Rejected player: nick "${nick}" is the DM's nick`);
                host.sendTo(peerId, Protocol.createNickTaken(nick));
                return;
            }

            // Check if this is a reconnecting player
            const oldPeerId = GameState.reconnectPlayer(state, peerId, nick, avatarData);
            if (oldPeerId) {
                console.log(`[DM] Player reconnected: ${nick} (was ${oldPeerId}, now ${peerId})`);
            } else {
                GameState.addPlayer(state, peerId, nick, avatarData);
                console.log(`[DM] New player joined: ${nick} (${peerId})`);
            }

            Storage.saveState(roomName, state);

            // Send state sync to the new player
            const playerView = GameState.createPlayerView(state, peerId);
            host.sendTo(peerId, Protocol.createStateSync(playerView));

            // Broadcast updated player list (with avatars) to everyone
            broadcastPlayerList();

            // Send avatar updates to the new player for all other players
            for (const [pid, player] of Object.entries(state.players)) {
                if (pid !== peerId && player.avatarData) {
                    host.sendTo(peerId, Protocol.createAvatarUpdate(pid, player.nick, player.avatarData));
                }
            }

            // Send DM avatar to the new player
            host.sendTo(peerId, Protocol.createAvatarUpdate('dm', dmNick, dmAvatar));

            // Broadcast new player's avatar to all other players
            host.broadcast(Protocol.createPlayerJoined(peerId, nick, avatarData));

            renderAll();
        }

        function handleRollRequest(peerId, msg) {
            if (!Protocol.isValidRollRequest(msg)) return;

            const player = state.players[peerId];
            if (!player) return;

            // Roll dice on DM side (anti-cheat)
            const result = Dice.rollMultiple(msg.dice);

            const rollResult = Protocol.createRollResult(
                peerId,
                player.nick,
                result.dice,
                result.total,
                msg.visibility,
                msg.targets
            );

            // Add to player's table and history
            GameState.addRoll(state, peerId, rollResult);
            Storage.saveState(roomName, state);

            // Play sound on DM side
            Sound.playDiceRoll();

            // Send result to appropriate players
            if (msg.visibility === Protocol.VISIBILITY.PUBLIC) {
                host.broadcast(rollResult);
            } else if (msg.visibility === Protocol.VISIBILITY.PRIVATE) {
                // Only send to the rolling player (DM already sees everything)
                host.sendTo(peerId, rollResult);
            } else if (msg.visibility === Protocol.VISIBILITY.TARGETED) {
                // Send to targeted players + the roller
                const recipients = new Set(msg.targets || []);
                recipients.add(peerId);
                for (const targetId of recipients) {
                    host.sendTo(targetId, rollResult);
                }
            }

            renderAll();
        }

        function handleClearMyTable(peerId) {
            GameState.clearTable(state, peerId);
            Storage.saveState(roomName, state);

            // Broadcast includes the requesting player, no separate sendTo needed
            host.broadcast(Protocol.createTableCleared(peerId));

            renderAll();
        }

        function handleUpdateProfile(peerId, msg) {
            const nick = msg.nick || 'Player';

            // Enforce unique nicknames
            for (const [existingId, existingPlayer] of Object.entries(state.players)) {
                if (existingPlayer.nick === nick && existingPlayer.connected && existingId !== peerId) {
                    console.log(`[DM] Rejected profile update: nick "${nick}" already taken by ${existingId}`);
                    host.sendTo(peerId, Protocol.createProfileUpdateRejected(nick));
                    return;
                }
            }
            // Check against DM nick
            if (nick === dmNick && peerId !== 'dm') {
                console.log(`[DM] Rejected profile update: nick "${nick}" is the DM's nick`);
                host.sendTo(peerId, Protocol.createProfileUpdateRejected(nick));
                return;
            }

            GameState.updatePlayerProfile(state, peerId, nick, msg.avatarData);
            Storage.saveState(roomName, state);

            host.broadcast(Protocol.createAvatarUpdate(peerId, nick, msg.avatarData));
            broadcastPlayerList();
            renderAll();
        }

        // --- DM Actions ---
        function dmRoll(diceSpec, visibility, targets) {
            const result = Dice.rollMultiple(diceSpec);
            const rollResult = Protocol.createRollResult(
                'dm',
                dmNick,
                result.dice,
                result.total,
                visibility,
                targets
            );

            // Add DM roll to DM table (merge or create new)
            if (dmAutoclear || state.dmTable.length === 0) {
                if (dmAutoclear) {
                    state.dmTable = [];
                    // Fix: Tell all players to clear the DM's table so they don't append
                    host.broadcast(Protocol.createTableCleared('dm'));
                }
                state.dmTable = [Object.assign({}, rollResult, { dice: rollResult.dice.slice() })];
            } else {
                const existing = state.dmTable[0];
                existing.dice = existing.dice.concat(rollResult.dice);
                existing.total += rollResult.total;
                existing.timestamp = rollResult.timestamp || Date.now();
            }

            // Add to history (individual roll)
            GameState.addDmRoll(state, rollResult);
            Storage.saveState(roomName, state);
            Sound.playDiceRoll();

            // Send result based on visibility
            if (visibility === Protocol.VISIBILITY.PUBLIC) {
                host.broadcast(rollResult);
            } else if (visibility === Protocol.VISIBILITY.TARGETED) {
                const recipients = new Set(targets || []);
                for (const targetId of recipients) {
                    host.sendTo(targetId, rollResult);
                }
            }
            // PRIVATE: DM only, no need to send

            renderAll();
        }

        function kickPlayer(peerId) {
            const player = state.players[peerId];
            if (!player) return;

            host.sendTo(peerId, Protocol.createPlayerKicked(peerId, player.nick));
            host.kickPlayer(peerId);
            GameState.removePlayer(state, peerId);
            Storage.saveState(roomName, state);

            host.broadcast(Protocol.createPlayerLeft(peerId, player.nick));
            broadcastPlayerList();
            renderAll();
        }

        function clearPlayerTable(peerId) {
            if (peerId === null) {
                // Clear all
                GameState.clearTable(state, null);
                state.dmTable = [];
                host.broadcast(Protocol.createTableCleared(null));
            } else if (peerId === 'dm') {
                state.dmTable = [];
                host.broadcast(Protocol.createTableCleared('dm'));
            } else {
                GameState.clearTable(state, peerId);
                host.broadcast(Protocol.createTableCleared(peerId));
            }
            Storage.saveState(roomName, state);
            renderAll();
        }

        function clearHistory() {
            GameState.clearHistory(state);
            Storage.saveState(roomName, state);
            host.broadcast(Protocol.createHistoryCleared());
            renderAll();
        }

        function broadcastPlayerList() {
            const playerList = GameState.getPlayerList(state);
            host.broadcast(Protocol.createPlayerList(playerList));
        }

        // --- Rendering (throttled) ---
        function doRenderAll() {
            renderPlayerPool();
            renderDiceRoller();
            renderHistoryPanel();
            renderDmPanel();
        }

        const renderAll = UIHelpers.createThrottledRender(doRenderAll);

        function renderPlayerPool() {
            PlayerPool.render(playerPoolEl, state, {
                isDM: true,
                myPeerId: 'dm',
                onClearTable: clearPlayerTable,
            });
        }

        function renderDiceRoller() {
            const players = GameState.getPlayerList(state);
            DiceRoller.render(diceRollerEl, {
                isDM: true,
                players,
                autoclear: dmAutoclear,
                onRoll: (diceSpec, visibility, targets) => {
                    dmRoll(diceSpec, visibility, targets);
                },
                onAutoclearChange: (enabled) => {
                    dmAutoclear = enabled;
                },
            });
        }

        function renderHistoryPanel() {
            HistoryPanel.render(historyPanelEl, state.history, {
                isDM: true,
                onClear: clearHistory,
            });
        }

        function renderDmPanel() {
            DmPanel.render(dmPanelEl, state, {
                onKick: kickPlayer,
                onClearTable: clearPlayerTable,
                onClearHistory: clearHistory,
            });
        }

        // --- UI Setup ---
        const historyToggle = HistoryPanel.createToggleButton(historyPanelEl);
        const dmToggle = DmPanel.createToggleButton(dmPanelEl);
        UIHelpers.setupPanelToolbar(
            document.querySelector('.game-header-actions'),
            [historyToggle, dmToggle]
        );

        UIHelpers.setupSoundToggle(soundToggle);

        document.getElementById('profile-settings-btn').addEventListener('click', () => {
            ProfileModal.show(dmNick, dmAvatar, (newNick, newAvatar) => {
                // Check local uniqueness first
                for (const [existingId, existingPlayer] of Object.entries(state.players)) {
                    if (existingPlayer.nick === newNick && existingPlayer.connected) {
                        alert(`The nickname "${newNick}" is already taken by a player.`);
                        return;
                    }
                }

                dmNick = newNick;
                dmAvatar = newAvatar;
                GameState.updatePlayerProfile(state, 'dm', newNick, newAvatar);

                // Update session
                const s = JSON.parse(localStorage.getItem('dice-online-session') || '{}');
                s.nick = newNick;
                s.avatar = newAvatar;
                localStorage.setItem('dice-online-session', JSON.stringify(s));

                Storage.saveState(roomName, state);
                host.broadcast(Protocol.createAvatarUpdate('dm', dmNick, dmAvatar));
                renderAll();
            });
        });

        // Leave table button
        document.getElementById('leave-btn').addEventListener('click', () => {
            if (confirm('Leave the table? All connected players will be disconnected.')) {
                host.destroy();
                Storage.clearState(roomName);
                window.location.href = 'index.html';
            }
        });

        // Initial render
        renderAll();

        // Save state before unload
        window.addEventListener('beforeunload', () => {
            Storage.saveStateNow(roomName, state);
        });
    } // end startGame()

    // Kick off async session init
    initSession();
});
