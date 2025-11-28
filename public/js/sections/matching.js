import { SubjectListUI } from '../components/subject-list.js';
import { AIMatchModal } from '../components/ai-modal.js';
import Matching from '../models/matching.js';

/**
 * Matching Section
 * Handles subject matching between Moodle and SUAP:
 * - Manual matching with search and selection
 * - AI-powered automatic matching
 */
export default class MatchingSection {
    #elements = {};
    #moodle;
    #suap;
    #ui;
    #modal;
    #onDataChange;

    /**
     * @param {Object} options
     * @param {Object} options.elements - Cached DOM elements
     * @param {Moodle} options.moodle - Moodle model instance
     * @param {SUAP} options.suap - SUAP model instance
     * @param {Function} options.onDataChange - Callback when data changes
     */
    constructor({ elements, moodle, suap, onDataChange }) {
        this.#elements = elements;
        this.#moodle = moodle;
        this.#suap = suap;
        this.#onDataChange = onDataChange;
        this.#ui = new SubjectListUI(elements);
        this.#modal = new AIMatchModal(elements);

        this.#attachEventListeners();
    }

    /**
     * Attach event listeners for matching actions
     */
    #attachEventListeners() {
        this.#elements.matchBtn.addEventListener('click', () => this.#performMatch());
        this.#elements.moodleSearch.addEventListener('input', (e) => this.#handleMoodleSearch(e.target.value));
        this.#elements.suapSearch.addEventListener('input', (e) => this.#handleSuapSearch(e.target.value));
        this.#elements.aiMatchBtn.addEventListener('click', () => this.#performAIMatching());
        this.#elements.matchedSectionHeader.addEventListener('click', () => this.#ui.toggleMatchedList());
    }

    /**
     * Update the UI with current data
     */
    updateUI() {
        const stats = this.#moodle.getStats();
        this.#ui.updateStats(stats);

        this.#handleMoodleSearch(this.#elements.moodleSearch.value);
        this.#handleSuapSearch(this.#elements.suapSearch.value);
        this.#ui.renderMatchedList(this.#moodle.getMatchedSubjects());
    }

    /**
     * Handle Moodle search
     * @param {string} filter - Search filter
     */
    #handleMoodleSearch(filter) {
        this.#ui.renderMoodleList(
            this.#moodle.getUnmatchedSubjects(),
            filter,
            (element, subject) => this.#selectMoodle(element, subject)
        );
    }

    /**
     * Handle SUAP search
     * @param {string} filter - Search filter
     */
    #handleSuapSearch(filter) {
        this.#ui.renderSuapList(
            this.#suap.getUnmatchedSubjects(),
            filter,
            (element, subject) => this.#selectSuap(element, subject)
        );
    }

    /**
     * Select Moodle subject
     * @param {HTMLElement} element - DOM element
     * @param {Object} subject - Subject data
     */
    #selectMoodle(element, subject) {
        this.#ui.clearSelection('#moodle-list');
        element.classList.add('selected');

        this.#ui.selectMoodle(subject.fullname);
        this.#updateMatchButton();
    }

    /**
     * Select/deselect SUAP subject (multi-select)
     * @param {HTMLElement} element - DOM element
     * @param {Object} subject - Subject data
     */
    #selectSuap(element, subject) {
        const isNowSelected = this.#ui.toggleSuap(subject.id);

        if (isNowSelected) {
            element.classList.add('selected');
        } else {
            element.classList.remove('selected');
        }

        this.#updateMatchButton();
    }

    /**
     * Update match button state
     */
    #updateMatchButton() {
        this.#elements.matchBtn.disabled = !this.#ui.canMatch();
    }

    /**
     * Perform manual match
     */
    async #performMatch() {
        if (!this.#ui.canMatch()) return;

        const moodleFullname = this.#ui.getSelectedMoodle();
        const suapIds = this.#ui.getSelectedSuap();

        try {
            await Matching.saveMatch(moodleFullname, suapIds);

            this.#ui.clearAllSelections();
            await this.#onDataChange();
        } catch (error) {
            // Error already handled in Matching
        }
    }

    /**
     * Perform AI matching
     */
    async #performAIMatching() {
        this.#updateButton(
            this.#elements.aiMatchBtn,
            true,
            '🤖 Starting...'
        );

        try {
            await this.#modal.startAIMatching(
                this.#moodle.getUnmatchedSubjects(),
                this.#suap.getUnmatchedSubjects(),
                () => this.#onAIMatchComplete()
            );
        } catch (error) {
            this.#updateButton(
                this.#elements.aiMatchBtn,
                false,
                '🤖 AI-Powered Matching'
            );
        }
    }

    /**
     * Callback after AI matching completes
     */
    async #onAIMatchComplete() {
        this.#updateButton(
            this.#elements.aiMatchBtn,
            false,
            '🤖 AI-Powered Matching'
        );
        await this.#onDataChange();
    }

    /**
     * Update button state and text
     * @param {HTMLElement} button - Button element
     * @param {boolean} disabled - Disabled state
     * @param {string} text - Button text
     */
    #updateButton(button, disabled, text) {
        button.disabled = disabled;
        button.textContent = text;
    }
}
