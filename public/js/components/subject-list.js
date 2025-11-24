import { escapeHtml, removeAccents } from '../helpers/text.js';

/**
 * UI Rendering Component
 * Handles all DOM manipulation and rendering for subject lists
 * Manages selection state internally
 */
export class SubjectListUI {
    #elements = {};
    #selectedMoodle = null;
    #selectedSuap = [];

    constructor(elements) {
        this.#elements = elements;
    }

    /**
     * Update statistics display
     * @param {{total: number, matched: number, percent: number}} stats
     */
    updateStats(stats) {
        const percentStr = stats.percent.toFixed(2);
        this.#elements.matchedCount.textContent = `${stats.matched} / ${stats.total} (${percentStr}%)`;
        this.#elements.matchedListCount.textContent = stats.matched;
    }

    /**
     * Render Moodle subjects list
     * @param {Array} subjects - Moodle subjects to render
     * @param {string} filter - Search filter
     * @param {Function} onSelect - Callback when subject is selected
     */
    renderMoodleList(subjects, filter, onSelect) {
        this.#elements.moodleList.innerHTML = '';
        
        subjects.forEach(subject => {
            const item = this.#createMoodleItem(subject, filter, onSelect);
            this.#elements.moodleList.appendChild(item);
        });
    }

    /**
     * Create Moodle subject list item
     * @param {Object} subject - Subject data
     * @param {string} filter - Search filter
     * @param {Function} onSelect - Click callback
     * @returns {HTMLElement}
     */
    #createMoodleItem(subject, filter, onSelect) {
        const fullname = subject.fullname.replace(/"/g, '');
        const searchText = `${fullname} ${subject.shortname} ${subject.category}`.toLowerCase();
        
        const div = document.createElement('div');
        div.className = 'subject-item';
        
        if (filter && !removeAccents(searchText).includes(removeAccents(filter.toLowerCase()))) {
            div.classList.add('hidden');
        }
        
        div.innerHTML = `
            <div class="subject-title">${escapeHtml(fullname)}</div>
            <div class="subject-details">${escapeHtml(subject.shortname)} • Category: ${escapeHtml(subject.category)}</div>
        `;
        
        div.addEventListener('click', () => onSelect(div, subject));
        
        return div;
    }

    /**
     * Render SUAP subjects list
     * @param {Array} subjects - SUAP subjects to render
     * @param {string} filter - Search filter
     * @param {Function} onSelect - Callback when subject is selected
     */
    renderSuapList(subjects, filter, onSelect) {
        this.#elements.suapList.innerHTML = '';
        
        subjects.forEach(subject => {
            const item = this.#createSuapItem(subject, filter, onSelect);
            this.#elements.suapList.appendChild(item);
        });
    }

    /**
     * Create SUAP subject list item
     * @param {Object} subject - Subject data
     * @param {string} filter - Search filter
     * @param {Function} onSelect - Click callback
     * @returns {HTMLElement}
     */
    #createSuapItem(subject, filter, onSelect) {
        const searchText = `${subject.fullname} ${subject.subjectName} ${subject.className}`.toLowerCase();
        
        const div = document.createElement('div');
        div.className = 'subject-item';
        
        if (filter && !removeAccents(searchText).includes(removeAccents(filter.toLowerCase()))) {
            div.classList.add('hidden');
        }
        
        div.innerHTML = `
            <div class="subject-title">${escapeHtml(subject.fullname)}</div>
            <div class="subject-details">ID: ${escapeHtml(subject.id)} • ${escapeHtml(subject.subjectName)}</div>
        `;
        
        div.addEventListener('click', () => onSelect(div, subject));
        
        return div;
    }

    /**
     * Render matched subjects list
     * @param {Array} subjects - Matched subjects to render
     */
    renderMatchedList(subjects) {
        this.#elements.matchedList.innerHTML = '';
        
        subjects.forEach(subject => {
            const item = this.#createMatchedItem(subject);
            this.#elements.matchedList.appendChild(item);
        });
    }

    /**
     * Create matched subject list item
     * @param {Object} subject - Matched subject data
     * @returns {HTMLElement}
     */
    #createMatchedItem(subject) {
        const div = document.createElement('div');
        div.className = 'matched-item';
        
        const moodleName = subject.fullname.replace(/"/g, '');
        
        // Handle multiple SUAP matches
        let suapContent = '';
        if (Array.isArray(subject.suapId)) {
            suapContent = subject.suapId.map(id => {
                const suapSubject = subject.suapMatch?.find(s => s.id === id);
                return suapSubject ? suapSubject.fullname : `ID: ${id}`;
            }).map(name => `<div class="suap-match-item">${escapeHtml(name)}</div>`).join('');
        } else {
            const suapName = subject.suapMatch ? subject.suapMatch.fullname : `ID: ${subject.suapId}`;
            suapContent = `<div class="suap-match-item">${escapeHtml(suapName)}</div>`;
        }
        
        div.innerHTML = `
            <div class="matched-source">
                <div class="label">Moodle</div>
                <div class="name">${escapeHtml(moodleName)}</div>
            </div>
            <div class="matched-arrow">↔</div>
            <div class="matched-target">
                <div class="label">SUAP ${Array.isArray(subject.suapId) && subject.suapId.length > 1 ? `(${subject.suapId.length})` : ''}</div>
                <div class="suap-matches">${suapContent}</div>
            </div>
        `;
        
        return div;
    }

    /**
     * Clear selection in a list
     * @param {string} selector - CSS selector for the list
     */
    clearSelection(selector) {
        document.querySelectorAll(`${selector} .subject-item`).forEach(item => {
            item.classList.remove('selected');
        });
    }

    /**
     * Toggle matched list visibility
     */
    toggleMatchedList() {
        this.#elements.matchedSectionHeader.classList.toggle('collapsed');
        this.#elements.matchedList.classList.toggle('collapsed');
    }

    /**
     * Update button state
     * @param {HTMLElement} button - Button element
     * @param {boolean} disabled - Disabled state
     * @param {string} text - Button text
     */
    updateButton(button, disabled, text) {
        button.disabled = disabled;
        button.textContent = text;
    }

    /**
     * Select a Moodle subject
     * @param {string} fullname - Moodle subject fullname
     */
    selectMoodle(fullname) {
        this.#selectedMoodle = fullname;
    }

    /**
     * Toggle SUAP subject selection (multi-select)
     * @param {string} id - SUAP subject ID
     * @returns {boolean} True if now selected, false if deselected
     */
    toggleSuap(id) {
        const index = this.#selectedSuap.indexOf(id);
        
        if (index > -1) {
            this.#selectedSuap.splice(index, 1);
            return false;
        } else {
            this.#selectedSuap.push(id);
            return true;
        }
    }

    /**
     * Clear all selections
     */
    clearAllSelections() {
        this.#selectedMoodle = null;
        this.#selectedSuap = [];
    }

    /**
     * Get selected Moodle subject
     * @returns {string|null}
     */
    getSelectedMoodle() {
        return this.#selectedMoodle;
    }

    /**
     * Get selected SUAP subjects
     * @returns {string[]}
     */
    getSelectedSuap() {
        return [...this.#selectedSuap];
    }

    /**
     * Check if match can be performed
     * @returns {boolean}
     */
    canMatch() {
        return this.#selectedMoodle !== null && this.#selectedSuap.length > 0;
    }
}
