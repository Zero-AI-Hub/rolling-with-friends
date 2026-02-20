/**
 * connection.js — PeerJS connection manager for Dice Online.
 * 
 * Implements star topology: DM is the hub, players connect to DM.
 * Uses the free public PeerJS cloud server for signalling.
 * 
 * Depends on: PeerJS library (loaded via CDN in HTML)
 */

const Connection = (() => {
    const PEER_PREFIX = 'dice-online-';
    const RECONNECT_DELAY_MS = 2000;
    const MAX_RECONNECT_ATTEMPTS = 10;

    /**
     * Create a DM (host) connection manager.
     * @param {string} roomName
     * @param {object} callbacks - { onPlayerConnected, onPlayerDisconnected, onMessage, onError, onOpen }
     * @returns {object} host manager
     */
    function createHost(roomName, callbacks) {
        const peerId = PEER_PREFIX + roomName;
        const connections = {}; // { peerId: DataConnection }
        let peer = null;
        let destroyed = false;

        function start() {
            peer = new Peer(peerId, {
                debug: 1,
            });

            peer.on('open', (id) => {
                console.log('[DM] Peer opened with ID:', id);
                if (callbacks.onOpen) callbacks.onOpen(id);
            });

            peer.on('connection', (conn) => {
                console.log('[DM] Player connecting:', conn.peer);

                conn.on('open', () => {
                    connections[conn.peer] = conn;
                    console.log('[DM] Player connected:', conn.peer);
                    if (callbacks.onPlayerConnected) callbacks.onPlayerConnected(conn.peer, conn);
                });

                conn.on('data', (data) => {
                    if (callbacks.onMessage) callbacks.onMessage(conn.peer, data);
                });

                conn.on('close', () => {
                    delete connections[conn.peer];
                    console.log('[DM] Player disconnected:', conn.peer);
                    if (callbacks.onPlayerDisconnected) callbacks.onPlayerDisconnected(conn.peer);
                });

                conn.on('error', (err) => {
                    console.error('[DM] Connection error with', conn.peer, err);
                });
            });

            peer.on('error', (err) => {
                console.error('[DM] Peer error:', err);
                if (callbacks.onError) callbacks.onError(err);

                // If the ID is taken, the room name is already in use
                if (err.type === 'unavailable-id') {
                    if (callbacks.onError) callbacks.onError(new Error('Room name already in use. Try a different name or reload to reclaim your room.'));
                }
            });

            peer.on('disconnected', () => {
                console.warn('[DM] Peer disconnected from signalling, attempting reconnect...');
                if (!destroyed && peer) {
                    peer.reconnect();
                }
            });
        }

        function sendTo(targetPeerId, msg) {
            const conn = connections[targetPeerId];
            if (conn && conn.open) {
                conn.send(msg);
            }
        }

        function broadcast(msg) {
            for (const conn of Object.values(connections)) {
                if (conn.open) {
                    conn.send(msg);
                }
            }
        }

        function sendToMultiple(peerIds, msg) {
            for (const id of peerIds) {
                sendTo(id, msg);
            }
        }

        function kickPlayer(peerId) {
            const conn = connections[peerId];
            if (conn) {
                conn.close();
                delete connections[peerId];
            }
        }

        function getConnectedPeerIds() {
            return Object.keys(connections).filter(id => connections[id].open);
        }

        function destroy() {
            destroyed = true;
            if (peer) {
                peer.destroy();
                peer = null;
            }
        }

        function getPeerId() {
            return peer ? peer.id : null;
        }

        return {
            start,
            sendTo,
            broadcast,
            sendToMultiple,
            kickPlayer,
            getConnectedPeerIds,
            destroy,
            getPeerId,
        };
    }

    /**
     * Create a Player (client) connection manager.
     * @param {string} roomName
     * @param {object} callbacks - { onConnected, onDisconnected, onMessage, onError }
     * @returns {object} client manager
     */
    function createClient(roomName, callbacks) {
        const dmPeerId = PEER_PREFIX + roomName;
        let peer = null;
        let conn = null;
        let destroyed = false;
        let reconnectAttempts = 0;

        function start() {
            peer = new Peer({
                debug: 1,
            });

            peer.on('open', (myId) => {
                console.log('[Player] My Peer ID:', myId);
                connectToDM();
            });

            peer.on('error', (err) => {
                console.error('[Player] Peer error:', err);
                if (callbacks.onError) callbacks.onError(err);
            });

            peer.on('disconnected', () => {
                console.warn('[Player] Peer disconnected from signalling, attempting reconnect...');
                if (!destroyed && peer) {
                    peer.reconnect();
                }
            });
        }

        function connectToDM() {
            conn = peer.connect(dmPeerId, {
                reliable: true,
            });

            conn.on('open', () => {
                console.log('[Player] Connected to DM');
                reconnectAttempts = 0;
                if (callbacks.onConnected) callbacks.onConnected(peer.id);
            });

            conn.on('data', (data) => {
                if (callbacks.onMessage) callbacks.onMessage(data);
            });

            conn.on('close', () => {
                console.log('[Player] Disconnected from DM');
                if (callbacks.onDisconnected) callbacks.onDisconnected();
                attemptReconnect();
            });

            conn.on('error', (err) => {
                console.error('[Player] Connection error:', err);
            });
        }

        function attemptReconnect() {
            if (destroyed || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
            reconnectAttempts++;
            const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttempts, 5);
            console.log(`[Player] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            setTimeout(() => {
                if (!destroyed && peer && !peer.destroyed) {
                    connectToDM();
                }
            }, delay);
        }

        function send(msg) {
            if (conn && conn.open) {
                conn.send(msg);
            }
        }

        function destroy() {
            destroyed = true;
            if (peer) {
                peer.destroy();
                peer = null;
            }
        }

        function isConnected() {
            return conn && conn.open;
        }

        function getPeerId() {
            return peer ? peer.id : null;
        }

        return {
            start,
            send,
            destroy,
            isConnected,
            getPeerId,
        };
    }

    return {
        createHost,
        createClient,
        PEER_PREFIX,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Connection;
}
