// --- index.js: Lobby Logic ---
let dmAvatar = 'builtin:0';
let playerAvatar = 'builtin:0';

document.addEventListener('DOMContentLoaded', () => {
    // Render avatar pickers
    AvatarPicker.render(
        document.getElementById('dm-avatar-picker'),
        (data) => { dmAvatar = data; },
        dmAvatar
    );

    AvatarPicker.render(
        document.getElementById('player-avatar-picker'),
        (data) => { playerAvatar = data; },
        playerAvatar
    );

    // Sanitize room name: lowercase, alphanumeric + hyphens only
    function sanitizeRoomName(name) {
        return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    // Create Room
    document.getElementById('create-room-btn').addEventListener('click', () => {
        const roomRaw = document.getElementById('dm-room-name').value.trim();
        const nick = document.getElementById('dm-nick').value.trim();

        if (!roomRaw) {
            document.getElementById('dm-room-name').classList.add('input-error');
            setTimeout(() => document.getElementById('dm-room-name').classList.remove('input-error'), 800);
            return;
        }
        if (!nick) {
            document.getElementById('dm-nick').classList.add('input-error');
            setTimeout(() => document.getElementById('dm-nick').classList.remove('input-error'), 800);
            return;
        }

        const room = sanitizeRoomName(roomRaw);
        localStorage.setItem('dice-online-session', JSON.stringify({
            room,
            nick,
            avatar: dmAvatar,
            role: 'dm',
        }));
        window.location.href = 'dm.html';
    });

    // Join Room
    document.getElementById('join-room-btn').addEventListener('click', () => {
        const roomRaw = document.getElementById('player-room-name').value.trim();
        const nick = document.getElementById('player-nick').value.trim();

        if (!roomRaw) {
            document.getElementById('player-room-name').classList.add('input-error');
            setTimeout(() => document.getElementById('player-room-name').classList.remove('input-error'), 800);
            return;
        }
        if (!nick) {
            document.getElementById('player-nick').classList.add('input-error');
            setTimeout(() => document.getElementById('player-nick').classList.remove('input-error'), 800);
            return;
        }

        const room = sanitizeRoomName(roomRaw);
        localStorage.setItem('dice-online-session', JSON.stringify({
            room,
            nick,
            avatar: playerAvatar,
            role: 'player',
        }));
        window.location.href = 'player.html';
    });

    // Allow Enter key to submit
    document.querySelectorAll('#create-card input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('create-room-btn').click();
        });
    });
    document.querySelectorAll('#join-card input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('join-room-btn').click();
        });
    });
});
