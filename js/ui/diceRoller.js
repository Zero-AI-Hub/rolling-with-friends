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

        // Visibility selector
        const visGroup = document.createElement('div');
        visGroup.className = 'visibility-group';

        const visLabel = document.createElement('label');
        visLabel.textContent = 'Visibility:';
        visLabel.htmlFor = 'visibility-select';

        const visSelect = document.createElement('select');
        visSelect.id = 'visibility-select';
        visSelect.className = 'visibility-select';

        const publicOpt = new Option('🌍 Public', 'PUBLIC');
        const privateOpt = new Option('🔒 DM Only', 'PRIVATE');
        visSelect.appendChild(publicOpt);
        visSelect.appendChild(privateOpt);

        // Targeted option only if there are other players
        if (options.players && options.players.length > 0) {
            const targetedOpt = new Option('🎯 Select players...', 'TARGETED');
            visSelect.appendChild(targetedOpt);
        }

        visGroup.appendChild(visLabel);
        visGroup.appendChild(visSelect);

        // Target player checkboxes (hidden by default)
        const targetGroup = document.createElement('div');
        targetGroup.className = 'target-group hidden';
        targetGroup.id = 'target-group';

        if (options.players) {
            options.players.forEach(p => {
                const label = document.createElement('label');
                label.className = 'target-label';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = p.id;
                cb.className = 'target-checkbox';
                label.appendChild(cb);
                label.appendChild(document.createTextNode(' ' + p.nick));
                targetGroup.appendChild(label);
            });
        }

        visSelect.addEventListener('change', () => {
            targetGroup.classList.toggle('hidden', visSelect.value !== 'TARGETED');
        });

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
        controls.appendChild(keepGroup);

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

            const visibility = visSelect.value;
            const targets = [];
            if (visibility === 'TARGETED') {
                targetGroup.querySelectorAll('.target-checkbox:checked').forEach(cb => {
                    targets.push(cb.value);
                });
            }

            const diceSpec = rollQueue.map(d => ({ sides: d.sides, count: d.count }));
            if (options.onRoll) options.onRoll(diceSpec, visibility, targets);

            // Clear queue after rolling
            rollQueue.length = 0;
            updateQueueDisplay();
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
        players.forEach(p => {
            const label = document.createElement('label');
            label.className = 'target-label';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = p.id;
            cb.className = 'target-checkbox';
            label.appendChild(cb);
            label.appendChild(document.createTextNode(' ' + p.nick));
            targetGroup.appendChild(label);
        });
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
