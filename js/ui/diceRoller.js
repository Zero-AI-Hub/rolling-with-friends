/**
 * diceRoller.js — Dice rolling UI component for Dice Online.
 * 
 * Renders dice buttons, roll queue, visibility selector, and autoclear toggle.
 */

const DiceRoller = (() => {
    const STANDARD_DICE = [2, 4, 6, 8, 10, 12, 20, 100];

    /**
     * Render the dice roller UI.
     * @param {HTMLElement} container
     * @param {object} options
     *   - isDM: boolean
     *   - players: [{id, nick}] (for targeted visibility)
     *   - onRoll: function(diceSpec, visibility, targets)
     *   - onAutoclearChange: function(enabled)
     *   - autoclear: boolean (initial state)
     */
    function render(container, options) {
        container.innerHTML = '';
        container.classList.add('dice-roller');

        // Roll queue display
        const queueSection = document.createElement('div');
        queueSection.className = 'roll-queue-section';

        const queueLabel = document.createElement('span');
        queueLabel.className = 'roll-queue-label';
        queueLabel.textContent = 'Roll Queue:';
        queueSection.appendChild(queueLabel);

        const queueDisplay = document.createElement('div');
        queueDisplay.className = 'roll-queue';
        queueDisplay.id = 'roll-queue';
        queueSection.appendChild(queueDisplay);

        const clearQueueBtn = document.createElement('button');
        clearQueueBtn.type = 'button';
        clearQueueBtn.className = 'btn btn-small btn-secondary';
        clearQueueBtn.textContent = '✕ Clear';
        clearQueueBtn.addEventListener('click', () => {
            rollQueue.length = 0;
            updateQueueDisplay();
        });
        queueSection.appendChild(clearQueueBtn);

        container.appendChild(queueSection);

        // Dice buttons
        const diceGrid = document.createElement('div');
        diceGrid.className = 'dice-grid';

        const rollQueue = []; // [{sides, count}]

        STANDARD_DICE.forEach(sides => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dice-btn';
            btn.dataset.sides = sides;
            btn.innerHTML = `<span class="dice-label">d${sides}</span>`;
            btn.title = `Add d${sides} to roll`;

            btn.addEventListener('click', () => {
                addToQueue(rollQueue, sides, 1);
                updateQueueDisplay();
            });

            diceGrid.appendChild(btn);
        });

        // Custom dice input
        const customGroup = document.createElement('div');
        customGroup.className = 'custom-dice-group';

        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.className = 'custom-dice-input';
        customInput.placeholder = 'e.g. 2d6 + 1d8';
        customInput.id = 'custom-dice-input';

        const customBtn = document.createElement('button');
        customBtn.type = 'button';
        customBtn.className = 'btn btn-small btn-accent';
        customBtn.textContent = '+ Add';
        customBtn.addEventListener('click', () => {
            const parsed = Dice.parseDiceString(customInput.value);
            if (parsed) {
                parsed.forEach(d => addToQueue(rollQueue, d.sides, d.count));
                customInput.value = '';
                updateQueueDisplay();
            } else {
                customInput.classList.add('input-error');
                setTimeout(() => customInput.classList.remove('input-error'), 800);
            }
        });

        customInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') customBtn.click();
        });

        customGroup.appendChild(customInput);
        customGroup.appendChild(customBtn);
        diceGrid.appendChild(customGroup);

        container.appendChild(diceGrid);

        // Controls row: visibility, autoclear, roll button
        const controls = document.createElement('div');
        controls.className = 'dice-controls';

        // Visibility selector — segmented toggle buttons
        const visGroup = document.createElement('div');
        visGroup.className = 'visibility-group';

        const visLabel = document.createElement('span');
        visLabel.className = 'visibility-label';
        visLabel.textContent = 'Visibility:';
        visGroup.appendChild(visLabel);

        const visBar = document.createElement('div');
        visBar.className = 'visibility-bar';

        let currentVisibility = 'PUBLIC';

        const visOptions = [
            { value: 'PUBLIC', emoji: '🌍', label: 'Public' },
            { value: 'PRIVATE', emoji: '🔒', label: 'Private' },
        ];
        // Only show Targeted if there are other players
        if (options.players && options.players.length > 0) {
            visOptions.push({ value: 'TARGETED', emoji: '🎯', label: 'Targeted' });
        }

        const visBtns = {};
        visOptions.forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'visibility-btn' + (opt.value === currentVisibility ? ' active' : '');
            btn.dataset.value = opt.value;
            btn.innerHTML = `<span class="vis-emoji">${opt.emoji}</span><span class="vis-text">${opt.label}</span>`;
            btn.title = opt.label;
            btn.addEventListener('click', () => {
                currentVisibility = opt.value;
                Object.values(visBtns).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                targetGroup.classList.toggle('hidden', opt.value !== 'TARGETED');
            });
            visBtns[opt.value] = btn;
            visBar.appendChild(btn);
        });

        visGroup.appendChild(visBar);

        // Target player chips (hidden by default, shown when TARGETED is selected)
        const targetGroup = document.createElement('div');
        targetGroup.className = 'target-group hidden';
        targetGroup.id = 'target-group';

        if (options.players && options.players.length > 0) {
            const targetLabel = document.createElement('span');
            targetLabel.className = 'target-prompt';
            targetLabel.textContent = 'Who can see this roll?';
            targetGroup.appendChild(targetLabel);

            const chipContainer = document.createElement('div');
            chipContainer.className = 'target-chips';

            options.players.forEach(p => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'target-chip';
                chip.dataset.playerId = p.id;
                chip.innerHTML = `<span class="chip-avatar">👤</span><span class="chip-name">${p.nick}</span>`;
                chip.addEventListener('click', () => {
                    chip.classList.toggle('selected');
                });
                chipContainer.appendChild(chip);
            });

            targetGroup.appendChild(chipContainer);
        }

        controls.appendChild(visGroup);
        controls.appendChild(targetGroup);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-container';
        toggleContainer.style.display = 'flex';
        toggleContainer.style.flexDirection = 'column';
        toggleContainer.style.gap = '8px';

        // "Remember dice pool" toggle
        const rememberGroup = document.createElement('div');
        rememberGroup.className = 'remember-dice-group';

        const rememberLabel = document.createElement('label');
        rememberLabel.className = 'toggle-switch-label';

        const rememberCb = document.createElement('input');
        rememberCb.type = 'checkbox';
        rememberCb.id = 'remember-dice-toggle';
        rememberCb.className = 'toggle-switch-input';

        let rememberDice = true;
        const storedRememberState = localStorage.getItem('dice-online-remember-pool');
        if (storedRememberState !== null) {
            rememberDice = storedRememberState === 'true';
        }
        rememberCb.checked = rememberDice;

        const rememberSlider = document.createElement('span');
        rememberSlider.className = 'toggle-switch-slider';

        rememberCb.addEventListener('change', () => {
            rememberDice = rememberCb.checked;
            localStorage.setItem('dice-online-remember-pool', rememberDice);
        });

        const rememberText = document.createElement('span');
        rememberText.className = 'toggle-switch-text';
        rememberText.textContent = 'Remember dice pool';

        rememberLabel.appendChild(rememberCb);
        rememberLabel.appendChild(rememberSlider);
        rememberLabel.appendChild(rememberText);
        rememberGroup.appendChild(rememberLabel);
        toggleContainer.appendChild(rememberGroup);

        // "Keep previous rolls" toggle (inverted autoclear)
        const keepGroup = document.createElement('div');
        keepGroup.className = 'keep-rolls-group';

        const keepLabel = document.createElement('label');
        keepLabel.className = 'toggle-switch-label';

        const keepCb = document.createElement('input');
        keepCb.type = 'checkbox';
        keepCb.id = 'keep-rolls-toggle';
        keepCb.className = 'toggle-switch-input';
        // autoclear ON means "don't keep" = unchecked
        keepCb.checked = !(options.autoclear === undefined ? true : options.autoclear);

        const slider = document.createElement('span');
        slider.className = 'toggle-switch-slider';

        keepCb.addEventListener('change', () => {
            // checked = keep rolls (autoclear OFF), unchecked = replace (autoclear ON)
            if (options.onAutoclearChange) options.onAutoclearChange(!keepCb.checked);
        });

        const keepText = document.createElement('span');
        keepText.className = 'toggle-switch-text';
        keepText.textContent = 'Keep previous rolls';

        keepLabel.appendChild(keepCb);
        keepLabel.appendChild(slider);
        keepLabel.appendChild(keepText);
        keepGroup.appendChild(keepLabel);
        toggleContainer.appendChild(keepGroup);

        controls.appendChild(toggleContainer);

        // Roll button
        const rollBtn = document.createElement('button');
        rollBtn.type = 'button';
        rollBtn.className = 'btn btn-roll';
        rollBtn.id = 'roll-btn';
        rollBtn.textContent = '🎲 Roll!';

        rollBtn.addEventListener('click', () => {
            if (rollQueue.length === 0) {
                rollBtn.classList.add('btn-shake');
                setTimeout(() => rollBtn.classList.remove('btn-shake'), 400);
                return;
            }

            const visibility = currentVisibility;
            const targets = [];
            if (visibility === 'TARGETED') {
                targetGroup.querySelectorAll('.target-chip.selected').forEach(chip => {
                    targets.push(chip.dataset.playerId);
                });
            }

            const diceSpec = rollQueue.map(d => ({ sides: d.sides, count: d.count }));
            if (options.onRoll) options.onRoll(diceSpec, visibility, targets);

            // Clear queue after rolling (if remember isn't on)
            if (!rememberDice) {
                rollQueue.length = 0;
                updateQueueDisplay();
            }
        });

        controls.appendChild(rollBtn);
        container.appendChild(controls);

        // Helper functions
        function addToQueue(queue, sides, count) {
            const existing = queue.find(d => d.sides === sides);
            if (existing) {
                existing.count += count;
            } else {
                queue.push({ sides, count });
            }
        }

        function updateQueueDisplay() {
            if (rollQueue.length === 0) {
                queueDisplay.innerHTML = '<span class="queue-empty">Click dice to add to roll...</span>';
                return;
            }
            queueDisplay.innerHTML = rollQueue
                .map(d => `<span class="queue-item">${d.count}d${d.sides}</span>`)
                .join('<span class="queue-plus">+</span>');
        }

        updateQueueDisplay();
    }

    /**
     * Update the player list for targeted visibility.
     */
    function updatePlayers(container, players) {
        const targetGroup = container.querySelector('#target-group');
        if (!targetGroup) return;

        targetGroup.innerHTML = '';

        if (players.length === 0) return;

        const targetLabel = document.createElement('span');
        targetLabel.className = 'target-prompt';
        targetLabel.textContent = 'Who can see this roll?';
        targetGroup.appendChild(targetLabel);

        const chipContainer = document.createElement('div');
        chipContainer.className = 'target-chips';

        players.forEach(p => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'target-chip';
            chip.dataset.playerId = p.id;
            chip.innerHTML = `<span class="chip-avatar">👤</span><span class="chip-name">${p.nick}</span>`;
            chip.addEventListener('click', () => {
                chip.classList.toggle('selected');
            });
            chipContainer.appendChild(chip);
        });

        targetGroup.appendChild(chipContainer);
    }

    return {
        render,
        updatePlayers,
        STANDARD_DICE,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiceRoller;
}
