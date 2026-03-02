import { Toast } from './components/toast.js';
import { Moodle } from './models/moodle.js';
import { SUAP } from './models/suap.js';
import { PipelineSection } from './sections/pipeline.js';
import { MatchingSection } from './sections/matching.js';
import { StudentsSection } from './sections/students.js';

/**
 * Subject Matcher Application
 * Main coordinator that initializes and orchestrates section modules
 */
class SubjectMatcherApp {
    #elements = {};
    #moodle;
    #suap;
    #pipelineSection;
    #matchingSection;
    #studentsSection;

    constructor() {
        this.#cacheElements();
        this.#initializeModels();
        this.#initializeSections();
        this.#initialize();
    }

    /**
     * Cache all DOM elements
     */
    #cacheElements() {
        this.#elements = {
            // Stats
            matchedCount: document.getElementById('matched-count'),
            matchedListCount: document.getElementById('matched-list-count'),

            // Matching section - Lists
            moodleList: document.getElementById('moodle-list'),
            suapList: document.getElementById('suap-list'),
            matchedList: document.getElementById('matched-list'),
            matchBtn: document.getElementById('match-btn'),
            moodleSearch: document.getElementById('moodle-search'),
            suapSearch: document.getElementById('suap-search'),
            aiMatchBtn: document.getElementById('ai-match-btn'),
            matchedSectionHeader: document.getElementById('matched-section-header'),

            // Matching section - Modal
            aiMatchModal: document.getElementById('ai-match-modal'),
            aiSuggestionsList: document.getElementById('ai-suggestions-list'),
            modalCloseBtn: document.getElementById('modal-close-btn'),
            modalCancelBtn: document.getElementById('modal-cancel-btn'),
            modalApproveBtn: document.getElementById('modal-approve-btn'),

            // Pipeline section
            generateCsvBtn: document.getElementById('generate-csv-btn'),
            extractSuapBtn: document.getElementById('extract-suap-btn'),
            uploadCoursesBtn: document.getElementById('upload-courses-btn'),
            ttYearInput: document.getElementById('tt-year-input'),
            ttSemesterInput: document.getElementById('tt-semester-input'),
            dateFromInput: document.getElementById('date-from-input'),
            dateToInput: document.getElementById('date-to-input'),
            suapYearInput: document.getElementById('suap-year-input'),
            suapSemesterInput: document.getElementById('suap-semester-input'),
            coursesCheckboxes: document.getElementById('courses-checkboxes'),

            // Students section
            studentsSubjectList: document.getElementById('students-subject-list'),
            extractStudentsBtn: document.getElementById('extract-students-btn'),
            extractStudentsOnlyBtn: document.getElementById('extract-students-only-btn'),
            extractProfessorsOnlyBtn: document.getElementById('extract-professors-only-btn'),
            selectAllStudentsBtn: document.getElementById('select-all-students-btn'),
            selectStudentsNotScrapedBtn: document.getElementById('select-students-not-scraped-btn'),
            deselectAllStudentsBtn: document.getElementById('deselect-all-students-btn'),
            selectAllProfessorsBtn: document.getElementById('select-all-professors-btn'),
            selectProfessorsNotScrapedBtn: document.getElementById('select-professors-not-scraped-btn'),
            deselectAllProfessorsBtn: document.getElementById('deselect-all-professors-btn'),
            studentsSelectedCount: document.getElementById('students-selected-count'),
            generateStudentsCsvBtn: document.getElementById('generate-students-csv-btn'),
            uploadStudentsBtn: document.getElementById('upload-students-btn'),
            
            // Professors section
            generateProfessorsCsvBtn: document.getElementById('generate-professors-csv-btn'),
            uploadProfessorsBtn: document.getElementById('upload-professors-btn'),
        };
    }

    /**
     * Initialize data models
     */
    #initializeModels() {
        this.#moodle = new Moodle();
        this.#suap = new SUAP();
    }

    /**
     * Initialize section modules
     */
    #initializeSections() {
        const sectionConfig = {
            elements: this.#elements,
            moodle: this.#moodle,
            suap: this.#suap,
            onDataChange: () => this.#loadData()
        };

        this.#pipelineSection = new PipelineSection(sectionConfig);
        this.#matchingSection = new MatchingSection(sectionConfig);
        this.#studentsSection = new StudentsSection(sectionConfig);
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
            this.#suap.loadSubjects(),
            this.#studentsSection.loadStudentsData()
        ]);
        this.#updateUI();
    }

    /**
     * Update entire UI by delegating to sections
     */
    #updateUI() {
        this.#matchingSection.updateUI();
        this.#studentsSection.updateUI();
    }
}

// Initialize the application
new SubjectMatcherApp();
