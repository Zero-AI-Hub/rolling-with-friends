/**
 * historyPanel.js — Roll history sidebar for Dice Online.
 * 
 * Shows a scrollable, toggleable log of all roll results.
 * DM can clear the history.
 */

const HistoryPanel = (() => {
    'use strict';
    /**
     * Render the history panel.
     * @param {HTMLElement} container
     * @param {Array} history - roll history entries
     * @param {object} options
     *   - isDM: boolean
     *   - onClear: function()
     */
    function render(container, history, options) {
        container.innerHTML = '';
        container.classList.add('history-panel');

        const header = document.createElement('div');
        header.className = 'panel-header';

        const title = document.createElement('h3');
        title.textContent = '📜 Roll History';
        header.appendChild(title);

        if (options.isDM) {
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'btn btn-small btn-danger';
            clearBtn.textContent = '🗑️ Clear';
            clearBtn.addEventListener('click', () => {
                if (options.onClear) options.onClear();
            });
            header.appendChild(clearBtn);
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn btn-small panel-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.title = 'Close panel';
        closeBtn.addEventListener('click', () => {
            container.classList.remove('panel-open');
            if (container._toggleBtn) container._toggleBtn.classList.remove('active');
        });
        header.appendChild(closeBtn);

        container.appendChild(header);

        const list = document.createElement('div');
        list.className = 'history-list';

        if (history.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'history-empty';
            empty.textContent = 'No rolls yet...';
            list.appendChild(empty);
        } else {
            // Use DocumentFragment for batch DOM insertion
            const fragment = document.createDocumentFragment();

            // Show newest first
            [...history].reverse().forEach(roll => {
                const entry = document.createElement('div');
                entry.className = 'history-entry';

                const meta = document.createElement('div');
                meta.className = 'history-meta';

                const nickEl = document.createElement('span');
                nickEl.className = 'history-nick';
                nickEl.textContent = roll.nick || 'Unknown';
                meta.appendChild(nickEl);

                const timeEl = document.createElement('span');
                timeEl.className = 'history-time';
                timeEl.textContent = formatTime(roll.timestamp);
                meta.appendChild(timeEl);

                if (roll.visibility !== 'PUBLIC') {
                    const visEl = document.createElement('span');
                    visEl.className = 'history-visibility';
                    visEl.textContent = roll.visibility === 'PRIVATE' ? '🔒' : '🎯';
                    meta.appendChild(visEl);
                }

                entry.appendChild(meta);

                // Dice formula
                const formula = document.createElement('div');
                formula.className = 'history-formula';
                formula.textContent = Dice.formatDiceSpec(roll.dice);
                entry.appendChild(formula);

                // Results
                const results = document.createElement('div');
                results.className = 'history-results';

                roll.dice.forEach(dieGroup => {
                    dieGroup.results.forEach(result => {
                        const chip = document.createElement('span');
                        chip.className = 'result-chip';
                        chip.textContent = result;

                        if (Dice.isCriticalHit(result, dieGroup.sides)) {
                            chip.classList.add('critical-hit');
                        } else if (Dice.isCriticalFail(result)) {
                            chip.classList.add('critical-fail');
                        }

                        results.appendChild(chip);
                    });
                });

                const totalChip = document.createElement('span');
                totalChip.className = 'result-chip result-total';
                totalChip.textContent = `= ${roll.total}`;
                results.appendChild(totalChip);

                entry.appendChild(results);
                fragment.appendChild(entry);
            });

            list.appendChild(fragment);
        }

        container.appendChild(list);
    }

    function formatTime(timestamp) {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    /**
     * Create the toggle button for the history panel.
     */
    function createToggleButton(panelElement) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-toggle-panel btn-history-toggle';
        btn.title = 'Toggle roll history';
        btn.textContent = '📜';
        btn.id = 'history-toggle';

        btn.addEventListener('click', () => {
            panelElement.classList.toggle('panel-open');
            btn.classList.toggle('active');
        });

        // Store reference so close buttons inside the panel can use it
        panelElement._toggleBtn = btn;

        return btn;
    }

    return {
        render,
        createToggleButton,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryPanel;
}
