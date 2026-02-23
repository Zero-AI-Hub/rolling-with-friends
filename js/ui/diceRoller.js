/**
 * diceRoller.js — Dice rolling UI component for Dice Online.
 * 
 * Renders dice buttons, roll queue, visibility selector, and autoclear toggle.
 */

const DiceRoller = (() => {
    'use strict';
    const STANDARD_DICE = [2, 4, 6, 8, 10, 12, 20, 100];

    // State kept outside DOM so updates don't wipe it
    const state = {
        initialized: false,
        rollQueue: [],
        currentVisibility: 'PUBLIC',
        keepQueue: false,
        autoclear: true,
    };

    /**
     * Initialize the dice roller UI if not already done.
     */
    function init(container, options) {
        if (state.initialized) {
            update(container, options);
            return;
        }

        container.innerHTML = '';
        container.classList.add('dice-roller');

        // Initial setup from options
        state.autoclear = options.autoclear === undefined ? true : options.autoclear;
        state.keepQueue = options.keepQueue || false;

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
            state.rollQueue.length = 0;
            updateQueueDisplay(queueDisplay);
        });
        queueSection.appendChild(clearQueueBtn);

        container.appendChild(queueSection);

        // Dice buttons
        const diceGrid = document.createElement('div');
        diceGrid.className = 'dice-grid';
        const diceFragment = document.createDocumentFragment();

        STANDARD_DICE.forEach(sides => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dice-btn';
            btn.dataset.sides = sides;
            btn.innerHTML = `<span class="dice-label">d${sides}</span>`;
            btn.title = `Add d${sides} to roll`;

            btn.addEventListener('click', () => {
                addToQueue(sides, 1);
                updateQueueDisplay(queueDisplay);
            });

            diceFragment.appendChild(btn);
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
                parsed.forEach(d => addToQueue(d.sides, d.count));
                customInput.value = '';
                updateQueueDisplay(queueDisplay);
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
        diceFragment.appendChild(customGroup);
        diceGrid.appendChild(diceFragment);

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
        visBar.id = 'visibility-bar'; // id for updating targets

        const targetGroup = document.createElement('div');
        targetGroup.className = 'target-group hidden';
        targetGroup.id = 'target-group';

        visGroup.appendChild(visBar);
        controls.appendChild(visGroup);
        controls.appendChild(targetGroup);

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
        keepCb.checked = !state.autoclear;

        const slider = document.createElement('span');
        slider.className = 'toggle-switch-slider';

        keepCb.addEventListener('change', () => {
            // checked = keep rolls (autoclear OFF), unchecked = replace (autoclear ON)
            state.autoclear = !keepCb.checked;
            if (container._diceRollerOptions && container._diceRollerOptions.onAutoclearChange) {
                container._diceRollerOptions.onAutoclearChange(state.autoclear);
            }
        });

        const keepText = document.createElement('span');
        keepText.className = 'toggle-switch-text';
        keepText.textContent = 'Keep previous rolls';

        keepLabel.appendChild(keepCb);
        keepLabel.appendChild(slider);
        keepLabel.appendChild(keepText);
        keepGroup.appendChild(keepLabel);
        controls.appendChild(keepGroup);

        // Roll button
        const rollBtn = document.createElement('button');
        rollBtn.type = 'button';
        rollBtn.className = 'btn btn-roll';
        rollBtn.id = 'roll-btn';
        rollBtn.textContent = '🎲 Roll!';

        rollBtn.addEventListener('click', () => {
            if (state.rollQueue.length === 0) {
                rollBtn.classList.add('btn-shake');
                setTimeout(() => rollBtn.classList.remove('btn-shake'), 400);
                return;
            }

            const visibility = state.currentVisibility;
            const targets = [];
            if (visibility === 'TARGETED') {
                targetGroup.querySelectorAll('.target-chip.selected').forEach(chip => {
                    targets.push(chip.dataset.playerId);
                });
            }

            const diceSpec = state.rollQueue.map(d => ({ sides: d.sides, count: d.count }));
            const currentOptions = container._diceRollerOptions || options;

            if (currentOptions.onRoll) {
                currentOptions.onRoll(diceSpec, visibility, targets);
            }

            // Clear queue after rolling (unless "keep queue" is enabled)
            if (!currentOptions.keepQueue) {
                state.rollQueue.length = 0;
                updateQueueDisplay(queueDisplay);
            }
        });

        controls.appendChild(rollBtn);
        container.appendChild(controls);

        state.initialized = true;

        // Initial queue display and targets
        updateQueueDisplay(queueDisplay);
        update(container, options);
    }

    /**
     * Update dynamic state (players for TARGETED list)
     */
    function update(container, options) {
        // Store options for callbacks (so they have access to the latest closures if needed)
        container._diceRollerOptions = options;

        // If external force changed keepQueue or autoclear
        if (options.autoclear !== undefined) {
            state.autoclear = options.autoclear;
            const keepCb = container.querySelector('#keep-rolls-toggle');
            if (keepCb) keepCb.checked = !state.autoclear;
        }

        if (options.keepQueue !== undefined) {
            state.keepQueue = options.keepQueue;
        }

        const visBar = container.querySelector('#visibility-bar');
        const targetGroup = container.querySelector('#target-group');
        if (!visBar || !targetGroup) return;

        // Update visibility options based on available players
        visBar.innerHTML = '';
        const visOptions = [
            { value: 'PUBLIC', emoji: '🌍', label: 'Public' },
            { value: 'PRIVATE', emoji: '🔒', label: 'Private' },
        ];

        // Exclude DM from target list if we're generating player chips
        const targetablePlayers = options.players || [];

        if (targetablePlayers.length > 0) {
            visOptions.push({ value: 'TARGETED', emoji: '🎯', label: 'Targeted' });
        } else if (state.currentVisibility === 'TARGETED') {
            state.currentVisibility = 'PUBLIC'; // Fallback if players left
        }

        const visBtns = {};
        visOptions.forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'visibility-btn' + (opt.value === state.currentVisibility ? ' active' : '');
            btn.dataset.value = opt.value;
            btn.innerHTML = `<span class="vis-emoji">${opt.emoji}</span><span class="vis-text">${opt.label}</span>`;
            btn.title = opt.label;
            btn.addEventListener('click', () => {
                state.currentVisibility = opt.value;
                Object.values(visBtns).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                targetGroup.classList.toggle('hidden', opt.value !== 'TARGETED');
            });
            visBtns[opt.value] = btn;
            visBar.appendChild(btn);
        });

        // Only show target group if TARGETED is selected
        targetGroup.classList.toggle('hidden', state.currentVisibility !== 'TARGETED');

        // Update players in target group, preserving selections
        const selectedIds = new Set(
            Array.from(targetGroup.querySelectorAll('.target-chip.selected'))
                .map(chip => chip.dataset.playerId)
        );

        targetGroup.innerHTML = '';

        if (targetablePlayers.length > 0) {
            const targetLabel = document.createElement('span');
            targetLabel.className = 'target-prompt';
            targetLabel.textContent = 'Who can see this roll?';
            targetGroup.appendChild(targetLabel);

            const chipContainer = document.createElement('div');
            chipContainer.className = 'target-chips';

            targetablePlayers.forEach(p => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'target-chip';
                if (selectedIds.has(p.id)) chip.classList.add('selected');
                chip.dataset.playerId = p.id;
                chip.innerHTML = `<span class="chip-avatar">👤</span><span class="chip-name">${p.nick}</span>`;
                chip.addEventListener('click', () => {
                    chip.classList.toggle('selected');
                });
                chipContainer.appendChild(chip);
            });

            targetGroup.appendChild(chipContainer);
        }
    }

    /**
     * Render entry point for backward compatibility.
     * Delegates to init/update.
     */
    function render(container, options) {
        init(container, options);
    }

    // Helper functions
    function addToQueue(sides, count) {
        const existing = state.rollQueue.find(d => d.sides === sides);
        if (existing) {
            existing.count += count;
        } else {
            state.rollQueue.push({ sides, count });
        }
    }

    function updateQueueDisplay(queueDisplay) {
        if (!queueDisplay) return;
        if (state.rollQueue.length === 0) {
            queueDisplay.innerHTML = '<span class="queue-empty">Click dice to add to roll...</span>';
            return;
        }
        queueDisplay.innerHTML = state.rollQueue
            .map(d => `<span class="queue-item">${d.count}d${d.sides}</span>`)
            .join('<span class="queue-plus">+</span>');
    }

    return {
        render,
        updatePlayers: update,
        STANDARD_DICE,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiceRoller;
}

