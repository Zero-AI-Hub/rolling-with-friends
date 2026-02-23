/**
 * profileModal.js — Settings modal for Dice Online.
 * 
 * Combines profile settings (nickname/avatar) and game preferences
 * (keep dice queue, keep previous rolls) into a single unified modal.
 */

const ProfileModal = (() => {
    /**
     * Show the settings modal.
     * @param {object} config
     *   - nick: string (current nickname)
     *   - avatar: string (current avatar)
     *   - keepQueue: boolean (current "keep dice queue" state)
     *   - autoclear: boolean (current autoclear state)
     *   - onSave: function(newNick, newAvatar) — called on profile save
     *   - onKeepQueueChange: function(enabled)
     *   - onAutoclearChange: function(enabled)
     */
    function show(config) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        let selectedAvatar = config.avatar;

        overlay.innerHTML = `
            <div class="modal-card settings-modal">
                <div class="modal-header">
                    <h3 class="modal-title">⚙️ Settings</h3>
                </div>
                <div class="modal-body">
                    <div class="settings-section">
                        <h4 class="settings-section-title">Profile</h4>
                        <div class="form-group">
                            <label for="profile-nick">Nickname</label>
                            <input type="text" id="profile-nick" class="input-text" value="" maxlength="20" placeholder="Enter nickname">
                        </div>
                        <div class="form-group">
                            <label>Avatar</label>
                            <div id="profile-avatar-container"></div>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h4 class="settings-section-title">Dice Preferences</h4>
                        <div class="settings-toggle-row">
                            <label class="toggle-switch-label" for="settings-keep-queue">
                                <input type="checkbox" id="settings-keep-queue" class="toggle-switch-input">
                                <span class="toggle-switch-slider"></span>
                                <span class="toggle-switch-text">Keep dice queue after rolling</span>
                            </label>
                        </div>
                        <div class="settings-toggle-row">
                            <label class="toggle-switch-label" for="settings-keep-rolls">
                                <input type="checkbox" id="settings-keep-rolls" class="toggle-switch-input">
                                <span class="toggle-switch-slider"></span>
                                <span class="toggle-switch-text">Keep previous rolls on table</span>
                            </label>
                        </div>
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
        nickInput.value = config.nick;

        const avatarContainer = overlay.querySelector('#profile-avatar-container');
        AvatarPicker.render(avatarContainer, (newAvatar) => {
            selectedAvatar = newAvatar;
        }, config.avatar);

        // Set toggle initial states
        const keepQueueCb = overlay.querySelector('#settings-keep-queue');
        keepQueueCb.checked = !!config.keepQueue;

        const keepRollsCb = overlay.querySelector('#settings-keep-rolls');
        // autoclear ON = don't keep rolls (unchecked), autoclear OFF = keep rolls (checked)
        keepRollsCb.checked = !(config.autoclear === undefined ? true : config.autoclear);

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

            // Apply profile changes
            if (config.onSave) config.onSave(newNick, selectedAvatar);

            // Apply dice preference changes
            if (config.onKeepQueueChange) config.onKeepQueueChange(keepQueueCb.checked);
            if (config.onAutoclearChange) config.onAutoclearChange(!keepRollsCb.checked);

            close();
        }

        cancelBtn.addEventListener('click', close);
        saveBtn.addEventListener('click', save);

        nickInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            }
        });

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
