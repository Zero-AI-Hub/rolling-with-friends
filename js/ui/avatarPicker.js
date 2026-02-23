/**
 * avatarPicker.js — Avatar selection component for Dice Online.
 * 
 * Provides a grid of built-in avatars + file upload with client-side
 * compression and WebP conversion.
 */

const AvatarPicker = (() => {
    'use strict';
    // Built-in avatar definitions (emoji-based for zero dependencies)
    const BUILT_IN_AVATARS = [
        { emoji: '⚔️', label: 'Warrior', bg: '#8B0000' },
        { emoji: '🧙', label: 'Wizard', bg: '#4B0082' },
        { emoji: '🏹', label: 'Ranger', bg: '#006400' },
        { emoji: '🗡️', label: 'Rogue', bg: '#2F4F4F' },
        { emoji: '🛡️', label: 'Paladin', bg: '#B8860B' },
        { emoji: '💀', label: 'Necromancer', bg: '#1a1a2e' },
        { emoji: '🐉', label: 'Dragon', bg: '#8B4513' },
        { emoji: '🧝', label: 'Elf', bg: '#2E8B57' },
        { emoji: '🧛', label: 'Vampire', bg: '#4a0e0e' },
        { emoji: '🐺', label: 'Werewolf', bg: '#3d3d3d' },
        { emoji: '🔮', label: 'Oracle', bg: '#6A0DAD' },
        { emoji: '🎭', label: 'Bard', bg: '#C71585' },
    ];

    const MAX_UPLOAD_SIZE = 128;
    const UPLOAD_QUALITY = 0.7;

    /**
     * Render the avatar picker into a container element.
     * @param {HTMLElement} container
     * @param {function} onSelect - callback(avatarData) — string: "builtin:idx" or "data:..."
     * @param {string} initialValue - initial selected avatar
     */
    function render(container, onSelect, initialValue) {
        container.innerHTML = '';
        container.classList.add('avatar-picker');

        const grid = document.createElement('div');
        grid.className = 'avatar-grid';

        // Built-in avatars
        BUILT_IN_AVATARS.forEach((avatar, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'avatar-option';
            btn.title = avatar.label;
            btn.dataset.index = idx;
            btn.style.backgroundColor = avatar.bg;
            btn.textContent = avatar.emoji;

            if (initialValue === `builtin:${idx}`) {
                btn.classList.add('selected');
            }

            btn.addEventListener('click', () => {
                grid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                onSelect(`builtin:${idx}`);
            });

            grid.appendChild(btn);
        });

        // Upload button
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'avatar-option avatar-upload';
        uploadBtn.title = 'Upload custom image';
        uploadBtn.textContent = '📷';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const dataUrl = await compressImage(file);
                grid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
                uploadBtn.classList.add('selected');
                uploadBtn.style.backgroundImage = `url(${dataUrl})`;
                uploadBtn.style.backgroundSize = 'cover';
                uploadBtn.textContent = '';
                onSelect(dataUrl);
            } catch (err) {
                console.error('Failed to process image:', err);
            } finally {
                // Reset so the same file can be selected again
                fileInput.value = '';
            }
        });

        grid.appendChild(uploadBtn);
        grid.appendChild(fileInput);
        container.appendChild(grid);
    }

    /**
     * Compress and resize an image file to WebP.
     * @param {File} file
     * @returns {Promise<string>} base64 data URL
     */
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = MAX_UPLOAD_SIZE;
                    canvas.height = MAX_UPLOAD_SIZE;
                    const ctx = canvas.getContext('2d');

                    // Center crop to square
                    const size = Math.min(img.width, img.height);
                    const x = (img.width - size) / 2;
                    const y = (img.height - size) / 2;
                    ctx.drawImage(img, x, y, size, size, 0, 0, MAX_UPLOAD_SIZE, MAX_UPLOAD_SIZE);

                    // Try WebP first, fall back to JPEG
                    let dataUrl = canvas.toDataURL('image/webp', UPLOAD_QUALITY);
                    if (!dataUrl.startsWith('data:image/webp')) {
                        dataUrl = canvas.toDataURL('image/jpeg', UPLOAD_QUALITY);
                    }
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Render an avatar into an element given avatar data.
     * @param {HTMLElement} element
     * @param {string} avatarData - "builtin:idx" or "data:..." URL
     */
    function renderAvatar(element, avatarData) {
        element.classList.add('avatar-display');
        if (!avatarData) {
            element.textContent = '👤';
            element.style.backgroundColor = '#555';
            element.style.backgroundImage = '';
            return;
        }

        if (avatarData.startsWith('builtin:')) {
            const idx = parseInt(avatarData.split(':')[1], 10);
            if (idx >= 0 && idx < BUILT_IN_AVATARS.length) {
                const avatar = BUILT_IN_AVATARS[idx];
                element.textContent = avatar.emoji;
                element.style.backgroundColor = avatar.bg;
                element.style.backgroundImage = '';
            }
        } else if (avatarData.startsWith('data:')) {
            element.textContent = '';
            element.style.backgroundImage = `url(${avatarData})`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
        }
    }

    return {
        render,
        renderAvatar,
        compressImage,
        BUILT_IN_AVATARS,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AvatarPicker;
}
