import Toast from './components/toast.js';
import { SubjectListUI } from './components/subject-list.js';
import { AIMatchModal } from './components/ai-modal.js';
import { getDefaultYearSemester } from './helpers/date.js';
import Moodle from './models/moodle.js';
import SUAP from './models/suap.js';
import Matching from './models/matching.js';

/**
 * Subject Matcher Application
 * Main page script that orchestrates the subject matching interface
 */
class SubjectMatcherApp {
    #elements = {};
    #moodle;
    #suap;
    #ui;
    #modal;

    constructor() {
        this.#cacheElements();
        this.#initializeComponents();
        this.#attachEventListeners();
        this.#initialize();
    }

    /**
     * Cache all DOM elements
     */
    #cacheElements() {
        this.#elements = {
            matchedCount: document.getElementById('matched-count'),
            matchedListCount: document.getElementById('matched-list-count'),
            moodleList: document.getElementById('moodle-list'),
            suapList: document.getElementById('suap-list'),
            matchedList: document.getElementById('matched-list'),
            matchBtn: document.getElementById('match-btn'),
            moodleSearch: document.getElementById('moodle-search'),
            suapSearch: document.getElementById('suap-search'),
            generateCsvBtn: document.getElementById('generate-csv-btn'),
            extractSuapBtn: document.getElementById('extract-suap-btn'),
            uploadCoursesBtn: document.getElementById('upload-courses-btn'),
            aiMatchBtn: document.getElementById('ai-match-btn'),
            ttYearInput: document.getElementById('tt-year-input'),
            ttSemesterInput: document.getElementById('tt-semester-input'),
            dateFromInput: document.getElementById('date-from-input'),
            dateToInput: document.getElementById('date-to-input'),
            suapYearInput: document.getElementById('suap-year-input'),
            suapSemesterInput: document.getElementById('suap-semester-input'),
            coursesCheckboxes: document.getElementById('courses-checkboxes'),
            matchedSectionHeader: document.getElementById('matched-section-header'),
            aiMatchModal: document.getElementById('ai-match-modal'),
            aiSuggestionsList: document.getElementById('ai-suggestions-list'),
            modalCloseBtn: document.getElementById('modal-close-btn'),
            modalCancelBtn: document.getElementById('modal-cancel-btn'),
            modalApproveBtn: document.getElementById('modal-approve-btn'),
        };
    }

    /**
     * Initialize all components
     */
    #initializeComponents() {
        this.#moodle = new Moodle();
        this.#suap = new SUAP();
        this.#ui = new SubjectListUI(this.#elements);
        this.#modal = new AIMatchModal(this.#elements);
    }

    /**
     * Attach event listeners
     */
    #attachEventListeners() {
        this.#elements.matchBtn.addEventListener('click', () => this.#performMatch());
        this.#elements.moodleSearch.addEventListener('input', (e) => this.#handleMoodleSearch(e.target.value));
        this.#elements.suapSearch.addEventListener('input', (e) => this.#handleSuapSearch(e.target.value));
        this.#elements.generateCsvBtn.addEventListener('click', () => this.#generateCSV());
        this.#elements.extractSuapBtn.addEventListener('click', () => this.#extractSUAP());
        this.#elements.uploadCoursesBtn.addEventListener('click', () => this.#uploadCourses());
        this.#elements.aiMatchBtn.addEventListener('click', () => this.#performAIMatching());
        this.#elements.matchedSectionHeader.addEventListener('click', () => this.#ui.toggleMatchedList());
        
        this.#setDefaultDateValues();
    }

    /**
     * Set default year and semester values
     */
    #setDefaultDateValues() {
        const { year, semester } = getDefaultYearSemester();
        
        this.#elements.ttYearInput.value = year;
        this.#elements.suapYearInput.value = year;
        this.#elements.ttSemesterInput.value = semester;
        this.#elements.suapSemesterInput.value = semester;
    }

    /**
     * Initialize application
     */
    async #initialize() {
        try {
            await this.#loadData();
        } catch (error) {
            console.error('Initialization error:', error);
            Toast.error('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Load all data and update UI
     */
    async #loadData() {
        await Promise.all([
            this.#moodle.loadSubjects(),
            this.#suap.loadSubjects()
        ]);
        this.#updateUI();
    }

    /**
     * Update entire UI
     */
    #updateUI() {
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
            await this.#loadData();
        } catch (error) {
            // Error already handled in Matching
        }
    }

    /**
     * Generate CSV from timetables
     */
    async #generateCSV() {
        this.#ui.updateButton(
            this.#elements.generateCsvBtn,
            true,
            'Extracting & Generating...'
        );
        
        try {
            const payload = this.#collectTimetableParams();
            await this.#moodle.generateCSV(payload);
            await this.#loadData();
        } catch (error) {
            // Error already handled in Moodle
        } finally {
            this.#ui.updateButton(
                this.#elements.generateCsvBtn,
                false,
                'Extract & Generate CSV'
            );
        }
    }

    /**
     * Collect timetable parameters from form
     * @returns {Object}
     */
    #collectTimetableParams() {
        const payload = {};
        
        if (this.#elements.ttYearInput.value) {
            payload.year = parseInt(this.#elements.ttYearInput.value);
        }
        
        if (this.#elements.ttSemesterInput.value) {
            payload.semester = parseInt(this.#elements.ttSemesterInput.value);
        }
        
        if (this.#elements.dateFromInput.value) {
            payload.dateFrom = this.#elements.dateFromInput.value;
        }
        
        if (this.#elements.dateToInput.value) {
            payload.dateTo = this.#elements.dateToInput.value;
        }
        
        return payload;
    }

    /**
     * Extract data from SUAP
     */
    async #extractSUAP() {
        this.#ui.updateButton(
            this.#elements.extractSuapBtn,
            true,
            'Extracting...'
        );
        
        try {
            const payload = this.#collectSuapParams();
            await this.#suap.extractSubjects(payload);
            await this.#loadData();
        } catch (error) {
            // Error already handled in SUAP
        } finally {
            this.#ui.updateButton(
                this.#elements.extractSuapBtn,
                false,
                'Extract from SUAP'
            );
        }
    }

    /**
     * Collect SUAP parameters from form
     * @returns {Object}
     */
    #collectSuapParams() {
        const payload = {};
        
        if (this.#elements.suapYearInput.value) {
            payload.year = parseInt(this.#elements.suapYearInput.value);
        }
        
        if (this.#elements.suapSemesterInput.value) {
            payload.semester = parseInt(this.#elements.suapSemesterInput.value);
        }
        
        const selectedCourses = Array.from(
            this.#elements.coursesCheckboxes.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);
        
        if (selectedCourses.length > 0) {
            payload.courses = selectedCourses;
        }
        
        return payload;
    }

    /**
     * Upload courses to Moodle
     */
    async #uploadCourses() {
        this.#ui.updateButton(
            this.#elements.uploadCoursesBtn,
            true,
            'Uploading...'
        );
        
        try {
            await this.#moodle.uploadCourses();
        } catch (error) {
            // Error already handled in Moodle
        } finally {
            this.#ui.updateButton(
                this.#elements.uploadCoursesBtn,
                false,
                'Upload to Moodle'
            );
        }
    }

    /**
     * Perform AI matching
     */
    async #performAIMatching() {
        this.#ui.updateButton(
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
            this.#ui.updateButton(
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
        this.#ui.updateButton(
            this.#elements.aiMatchBtn,
            false,
            '🤖 AI-Powered Matching'
        );
        await this.#loadData();
    }
}

// Initialize the application
new SubjectMatcherApp();
