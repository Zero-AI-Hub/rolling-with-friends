/**
 * historyPanel.js — Roll history sidebar for Dice Online.
 * 
 * Shows a scrollable, toggleable log of all roll results.
 * DM can clear the history.
 */

const HistoryPanel = (() => {
    'use strict';

    /**
     * Initialize the history panel UI shell
     */
    function init(container, options) {
        if (container._historyInitialized) return;

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
                if (container._historyOptions && container._historyOptions.onClear) {
                    container._historyOptions.onClear();
                }
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
        list.id = 'history-list-container';
        container.appendChild(list);

        container._renderedHistoryCount = 0;
        container._historyInitialized = true;
    }

    /**
     * Update the history panel. Only appends new items.
     * @param {HTMLElement} container
     * @param {Array} history - roll history entries
     * @param {object} options
     */
    function update(container, history, options) {
        container._historyOptions = options; // store options for callbacks

        const list = container.querySelector('#history-list-container');
        if (!list) return;

        // If history was cleared
        if (history.length === 0) {
            list.innerHTML = '';
            const empty = document.createElement('div');
            empty.className = 'history-empty';
            empty.textContent = 'No rolls yet...';
            list.appendChild(empty);
            container._renderedHistoryCount = 0;
            return;
        }

        // If we have items and the empty message is still there, clear it
        const emptyEl = list.querySelector('.history-empty');
        if (emptyEl) {
            emptyEl.remove();
        }

        // If array size shrank, or completely changed (re-render fallback)
        if (history.length < container._renderedHistoryCount) {
            list.innerHTML = '';
            container._renderedHistoryCount = 0;
        }

        const newItemsCount = history.length - container._renderedHistoryCount;
        if (newItemsCount === 0) return; // Nothing new

        // Grab only the new items
        const newRolls = document.createDocumentFragment();

        // Items are pushed to the end of history array.
        // We want newest first in the UI, so we prepend them.
        const settings = options.state ? options.state.settings : { critHit: 20, critFail: 1 };
        for (let i = container._renderedHistoryCount; i < history.length; i++) {
            const roll = history[i];
            const entry = createHistoryEntry(roll, settings);
            // Prepend new rolls to the top
            newRolls.prepend(entry);
        }

        list.prepend(newRolls);
        container._renderedHistoryCount = history.length;
    }

    function createHistoryEntry(roll, settings) {
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

                if (Dice.isCriticalHit(result, dieGroup.sides, settings.critHit)) {
                    chip.classList.add('critical-hit');
                } else if (Dice.isCriticalFail(result, settings.critFail)) {
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
        return entry;
    }

    /**
     * Render entry point for backward compatibility.
     * Delegates to init/update.
     */
    function render(container, history, options) {
        init(container, options);
        update(container, history, options);
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
