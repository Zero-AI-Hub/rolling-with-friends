/**
 * profileModal.js — Profile settings modal for Dice Online.
 * 
 * Allows users to change their nickname and avatar mid-game.
 */

const ProfileModal = (() => {
    /**
     * Show the profile configuration modal.
     * @param {string} currentNick 
     * @param {string} currentAvatar 
     * @param {function} onSave - callback(newNick, newAvatar)
     */
    function show(currentNick, currentAvatar, onSave) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        let selectedAvatar = currentAvatar;

        overlay.innerHTML = `
            <div class="modal-card profile-modal">
                <div class="modal-header">
                    <h3 class="modal-title">⚙️ Profile Settings</h3>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="profile-nick">Nickname</label>
                        <input type="text" id="profile-nick" class="input-text" value="" maxlength="20" placeholder="Enter nickname">
                    </div>
                    <div class="form-group">
                        <label>Avatar</label>
                        <div id="profile-avatar-container"></div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" id="profile-cancel">Cancel</button>
                    <button type="button" class="btn btn-accent" id="profile-save">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const nickInput = overlay.querySelector('#profile-nick');
        const { escapeHTML } = UIHelpers;
        // manually set the value to avoid HTML injection in the template literal
        nickInput.value = currentNick;

        const avatarContainer = overlay.querySelector('#profile-avatar-container');

        // Render the picker inside the modal
        AvatarPicker.render(avatarContainer, (newAvatar) => {
            selectedAvatar = newAvatar;
        }, currentAvatar);

        const cancelBtn = overlay.querySelector('#profile-cancel');
        const saveBtn = overlay.querySelector('#profile-save');

        function close() {
            overlay.remove();
        }

        function save() {
            const newNick = nickInput.value.trim();
            if (!newNick) {
                alert('Nickname cannot be empty.');
                return;
            }
            onSave(newNick, selectedAvatar);
            close();
        }

        cancelBtn.addEventListener('click', close);
        saveBtn.addEventListener('click', save);

        // Allow pressing Enter in the nick input to save
        nickInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            }
        });

        // Focus the input
        nickInput.focus();
        nickInput.select();
    }

    return {
        show,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileModal;
}
