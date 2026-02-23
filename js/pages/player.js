// --- Player Page Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem('dice-online-session') || '{}');
    const roomName = session.room;
    let myNick = session.nick || 'Player';
    let myAvatar = session.avatar || 'builtin:0';

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

    // --- Local State ---
    let localState = {
        roomName,
        dmNick: 'DM',
        dmAvatar: null,
        dmTable: [],
        players: {},
        history: [],
    };
    let myPeerId = null;
    let autoclear = true; // Default: replace rolls
    let keepQueue = false; // Default: clear queue after rolling
    let playerList = []; // [{id, nick}] for targeting

    // --- Connection ---
    const client = Connection.createClient(roomName, {
        onConnected: (peerId) => {
            myPeerId = peerId;
            setStatus('online', 'Connected');
            hideBanner();

            // Send player info to DM
            client.send(Protocol.createPlayerInfo(myNick, myAvatar));
            renderAll();
        },
        onDisconnected: () => {
            setStatus('offline', 'Disconnected');
            showBanner('Disconnected from DM. Reconnecting...', 'connecting');
        },
        onMessage: (msg) => {
            handleMessage(msg);
        },
        onError: (err) => {
            console.error('[Player] Error:', err);
            setStatus('offline', 'Error');
            showBanner(err.message || 'Connection error', 'error');
        },
    });

    showBanner('Connecting to room...', 'connecting');
    client.start();

    // --- Message Handling ---
    function handleMessage(msg) {
        if (!Protocol.isValidMessage(msg)) return;

        switch (msg.type) {
            case Protocol.MSG.STATE_SYNC:
                handleStateSync(msg);
                break;
            case Protocol.MSG.ROLL_RESULT:
                handleRollResult(msg);
                break;
            case Protocol.MSG.PLAYER_JOINED:
                handlePlayerJoined(msg);
                break;
            case Protocol.MSG.PLAYER_LEFT:
                handlePlayerLeft(msg);
                break;
            case Protocol.MSG.PLAYER_KICKED:
                handlePlayerKicked(msg);
                break;
            case Protocol.MSG.TABLE_CLEARED:
                handleTableCleared(msg);
                break;
            case Protocol.MSG.HISTORY_CLEARED:
                handleHistoryCleared();
                break;
            case Protocol.MSG.PLAYER_LIST:
                handlePlayerList(msg);
                break;
            case Protocol.MSG.AVATAR_UPDATE:
                handleAvatarUpdate(msg);
                break;
            case Protocol.MSG.NICK_TAKEN:
                handleNickTaken(msg);
                break;
            case Protocol.MSG.PROFILE_UPDATE_REJECTED:
                handleProfileUpdateRejected(msg);
                break;
            default:
                console.warn('[Player] Unknown message:', msg.type);
        }
    }

    function handleStateSync(msg) {
        const s = msg.state;
        if (!s) return;

        localState.roomName = s.roomName || roomName;
        localState.dmNick = s.dmNick || 'DM';
        localState.dmAvatar = s.dmAvatar;
        localState.dmTable = s.dmTable || [];
        localState.players = s.players || {};
        localState.history = s.history || [];

        renderAll();
    }

    function handleRollResult(msg) {
        Sound.playDiceRoll();

        // Merge into appropriate player's table
        const playerId = msg.playerId;
        if (playerId === 'dm') {
            localState.dmTable = mergeIntoTable(localState.dmTable || [], msg);
        } else if (localState.players[playerId]) {
            const player = localState.players[playerId];
            player.table = mergeIntoTable(player.table || [], msg);
        } else if (playerId === myPeerId) {
            // It's my own roll — create entry if needed
            if (!localState.players[myPeerId]) {
                localState.players[myPeerId] = {
                    nick: myNick,
                    avatarData: myAvatar,
                    connected: true,
                    table: [],
                };
            }
            localState.players[myPeerId].table = mergeIntoTable(
                localState.players[myPeerId].table, msg
            );
        }

        // Add individual roll to history
        localState.history.push(msg);

        renderAll();
    }

    /**
     * Merge a roll result into a table (array of roll entries).
     * If table has an existing entry, appends dice and updates total.
     * If empty, creates a new entry.
     */
    function mergeIntoTable(table, rollResult) {
        if (table.length > 0) {
            const existing = table[0];
            existing.dice = existing.dice.concat(rollResult.dice);
            existing.total += rollResult.total;
            existing.timestamp = rollResult.timestamp || Date.now();
            return [existing];
        } else {
            return [Object.assign({}, rollResult, {
                dice: rollResult.dice.slice(),
            })];
        }
    }

    function handlePlayerJoined(msg) {
        if (msg.playerId !== myPeerId) {
            localState.players[msg.playerId] = {
                nick: msg.nick,
                avatarData: msg.avatarData,
                connected: true,
                table: [],
            };
        }
        renderAll();
    }

    function handlePlayerLeft(msg) {
        delete localState.players[msg.playerId];
        renderAll();
    }

    function handlePlayerKicked(msg) {
        if (msg.playerId === myPeerId) {
            alert('You have been kicked from the room.');
            window.location.href = 'index.html';
        } else {
            delete localState.players[msg.playerId];
            renderAll();
        }
    }

    function handleTableCleared(msg) {
        if (msg.playerId === null) {
            for (const p of Object.values(localState.players)) {
                p.table = [];
            }
            localState.dmTable = [];
        } else if (msg.playerId === 'dm') {
            localState.dmTable = [];
        } else if (localState.players[msg.playerId]) {
            localState.players[msg.playerId].table = [];
        }
        renderAll();
    }

    function handleHistoryCleared() {
        localState.history = [];
        renderAll();
    }

    function handlePlayerList(msg) {
        playerList = msg.players || [];
        // Update connection status
        for (const p of playerList) {
            if (localState.players[p.id]) {
                localState.players[p.id].connected = p.connected;
            }
        }
        renderAll();
    }

    function handleAvatarUpdate(msg) {
        if (msg.playerId === 'dm') {
            localState.dmAvatar = msg.avatarData;
            localState.dmNick = msg.nick;
        } else if (localState.players[msg.playerId]) {
            localState.players[msg.playerId].avatarData = msg.avatarData;
            localState.players[msg.playerId].nick = msg.nick;
        }

        // If it's this player, update session overrides
        if (msg.playerId === myPeerId) {
            myNick = msg.nick;
            myAvatar = msg.avatarData;

            const s = JSON.parse(localStorage.getItem('dice-online-session') || '{}');
            s.nick = myNick;
            s.avatar = myAvatar;
            localStorage.setItem('dice-online-session', JSON.stringify(s));
        }

        renderAll();
    }

    function handleNickTaken(msg) {
        alert(msg.message || `The nickname "${msg.nick}" is already taken. Choose a different one.`);
        window.location.href = 'index.html';
    }

    function handleProfileUpdateRejected(msg) {
        alert(msg.message || `Profile update rejected: Nickname already taken.`);
    }

    // --- Player Actions ---
    function requestRoll(diceSpec, visibility, targets) {
        // Autoclear: tell DM to clear our table first
        if (autoclear) {
            client.send({ type: Protocol.MSG.CLEAR_MY_TABLE });
            // Optimistically clear local
            if (localState.players[myPeerId]) {
                localState.players[myPeerId].table = [];
            }
        }

        // DM always sees player rolls
        client.send(Protocol.createRollRequest(diceSpec, visibility, targets));
    }

    function clearMyTable() {
        client.send({ type: Protocol.MSG.CLEAR_MY_TABLE });
        if (localState.players[myPeerId]) {
            localState.players[myPeerId].table = [];
        }
        renderAll();
    }

    // --- Rendering (throttled) ---
    function doRenderAll() {
        renderPlayerPool();
        renderDiceRoller();
        renderHistoryPanel();
    }

    const renderAll = UIHelpers.createThrottledRender(doRenderAll);

    function renderPlayerPool() {
        PlayerPool.render(playerPoolEl, localState, {
            isDM: false,
            myPeerId,
            onClearTable: (peerId) => {
                if (peerId === myPeerId || peerId === undefined) {
                    clearMyTable();
                }
            },
        });
    }

    function renderDiceRoller() {
        // Filter player list for targeting: exclude self
        const otherPlayers = playerList.filter(p => p.id !== myPeerId);
        DiceRoller.render(diceRollerEl, {
            isDM: false,
            players: otherPlayers,
            autoclear,
            keepQueue,
            onRoll: requestRoll,
            onAutoclearChange: (enabled) => {
                autoclear = enabled;
            },
        });
    }

    function renderHistoryPanel() {
        HistoryPanel.render(historyPanelEl, localState.history, {
            isDM: false,
        });
    }

    // --- UI Setup ---
    const historyToggle = HistoryPanel.createToggleButton(historyPanelEl);
    UIHelpers.setupPanelToolbar(
        document.querySelector('.game-header-actions'),
        [historyToggle]
    );

    UIHelpers.setupSoundToggle(soundToggle);

    document.getElementById('profile-settings-btn').addEventListener('click', () => {
        ProfileModal.show({
            nick: myNick,
            avatar: myAvatar,
            keepQueue,
            onSave: (newNick, newAvatar) => {
                client.send(Protocol.createUpdateProfile(newNick, newAvatar));
            },
            onKeepQueueChange: (enabled) => {
                keepQueue = enabled;
            },
        });
    });

    // Leave table button
    document.getElementById('leave-btn').addEventListener('click', () => {
        if (confirm('Leave the table?')) {
            client.destroy();
            window.location.href = 'index.html';
        }
    });

    // Initial render
    renderAll();
});
