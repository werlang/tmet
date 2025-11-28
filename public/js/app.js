import Toast from './components/toast.js';
import { SubjectListUI } from './components/subject-list.js';
import { AIMatchModal } from './components/ai-modal.js';
import ProgressModal from './components/progress-modal.js';
import StudentsModal from './components/students-modal.js';
import { getDefaultYearSemester } from './helpers/date.js';
import Moodle from './models/moodle.js';
import SUAP from './models/suap.js';
import Matching from './models/matching.js';
import Request from './helpers/request.js';

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
    #progressModal;
    #studentsModal;
    #selectedSubjectIds = new Set();
    #studentsData = {};
    #studentUrl = '';

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
            studentsSubjectList: document.getElementById('students-subject-list'),
            extractStudentsBtn: document.getElementById('extract-students-btn'),
            selectAllStudentsBtn: document.getElementById('select-all-students-btn'),
            selectNotScrapedBtn: document.getElementById('select-not-scraped-btn'),
            deselectAllStudentsBtn: document.getElementById('deselect-all-students-btn'),
            studentsSelectedCount: document.getElementById('students-selected-count'),
            generateStudentsCsvBtn: document.getElementById('generate-students-csv-btn'),
            uploadStudentsBtn: document.getElementById('upload-students-btn'),
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
        this.#progressModal = new ProgressModal();
        this.#studentsModal = new StudentsModal();
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
        this.#elements.extractStudentsBtn.addEventListener('click', () => this.#extractStudents());
        this.#elements.selectAllStudentsBtn.addEventListener('click', () => this.#selectAllSubjects());
        this.#elements.selectNotScrapedBtn.addEventListener('click', () => this.#selectNotScraped());
        this.#elements.deselectAllStudentsBtn.addEventListener('click', () => this.#deselectAllSubjects());
        
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
            this.#suap.loadSubjects(),
            this.#loadStudentsData()
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
        this.#renderStudentsSubjectList();
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
        
        this.#progressModal.show({
            title: 'Generating Moodle CSV',
            message: 'Fetching timetable data from EduPage'
        });
        
        try {
            const payload = this.#collectTimetableParams();
            
            const result = await this.#moodle.generateCSV(payload, (message) => {
                this.#progressModal.updateStatus(message);
                this.#ui.updateButton(
                    this.#elements.generateCsvBtn,
                    true,
                    message
                );
            });
            
            this.#progressModal.updateStatus('Reloading data');
            await this.#loadData();
            
            this.#progressModal.hide();
            Toast.success(result.message || 'CSV generated successfully');
        } catch (error) {
            this.#progressModal.hide();
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
        
        this.#progressModal.show({
            title: 'Extracting SUAP Data',
            message: 'Launching browser automation',
            warning: 'This process involves web scraping and may take a few minutes depending on the number of courses selected.'
        });
        
        try {
            const payload = this.#collectSuapParams();
            const result = await this.#suap.extractSubjects(payload, (message) => {
                this.#progressModal.updateStatus(message);
                this.#ui.updateButton(
                    this.#elements.extractSuapBtn,
                    true,
                    message
                );
            });
            
            this.#progressModal.updateStatus('Reloading data');
            await this.#loadData();
            
            this.#progressModal.hide();
            Toast.success(result.message || 'SUAP data extracted successfully');
        } catch (error) {
            this.#progressModal.hide();
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
        
        this.#progressModal.show({
            title: 'Uploading Courses to Moodle',
            message: 'Preparing course data'
        });
        
        try {
            const result = await this.#moodle.uploadCourses((message) => {
                this.#progressModal.updateStatus(message);
                this.#ui.updateButton(
                    this.#elements.uploadCoursesBtn,
                    true,
                    message
                );
            });
            
            this.#progressModal.hide();
            const summary = result.results 
                ? `Created: ${result.results.success.length}, Failed: ${result.results.errors.length}`
                : '';
            Toast.success((result.message || 'Courses uploaded successfully') + (summary ? '. ' + summary : ''));
        } catch (error) {
            this.#progressModal.hide();
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

    /**
     * Load students data from file
     */
    async #loadStudentsData() {
        try {
            const response = await Request.get('/api/suap/students');
            // format: {subjects: {id: [enrollments]}, students: {enrollment: info}}
            this.#studentsData = response.data || { subjects: {}, students: {} };
            this.#studentUrl = response.studentUrl;
        } catch (error) {
            console.error('Error loading students data:', error);
            this.#studentsData = { subjects: {}, students: {} };
        }
    }

    /**
     * Render students subject list
     */
    #renderStudentsSubjectList() {
        const matchedSubjects = this.#suap.getMatchedSubjects();
        const container = this.#elements.studentsSubjectList;
        
        container.innerHTML = '';
        
        if (matchedSubjects.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'students-empty-state';
            emptyState.innerHTML = '<p><strong>No matched subjects yet</strong></p><p>Match subjects first in Step 3 before extracting students</p>';
            container.appendChild(emptyState);
            return;
        }
        
        matchedSubjects.forEach(subject => {
            const card = this.#createStudentSubjectCard(subject);
            container.appendChild(card);
        });
    }

    /**
     * Create a subject card for student extraction
     * @param {Object} subject - SUAP subject
     */
    #createStudentSubjectCard(subject) {
        const enrollments = this.#studentsData.subjects?.[subject.id];
        const hasStudents = !!enrollments && enrollments.length > 0;
        const studentCount = hasStudents ? enrollments.length : 0;
        const isSelected = this.#selectedSubjectIds.has(subject.id);
        
        const card = document.createElement('div');
        card.className = 'student-subject-card';
        if (hasStudents) card.classList.add('has-students');
        if (isSelected) card.classList.add('selected');
        
        const header = document.createElement('div');
        header.className = 'student-subject-header';
        
        // Custom checkbox structure
        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = 'checkbox-wrapper';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'student-subject-checkbox';
        checkbox.checked = isSelected;
        
        // Handle checkbox change directly
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.#toggleSubjectSelection(subject.id, e.target.checked);
        });
        
        // Handle wrapper click to toggle checkbox
        checkboxWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                this.#toggleSubjectSelection(subject.id, checkbox.checked);
            }
        });

        const checkmark = document.createElement('div');
        checkmark.className = 'custom-checkmark';
        checkmark.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        
        checkboxWrapper.appendChild(checkbox);
        checkboxWrapper.appendChild(checkmark);
        
        const name = document.createElement('div');
        name.className = 'student-subject-name';
        name.textContent = subject.fullname || subject.name;
        
        header.appendChild(checkboxWrapper);
        header.appendChild(name);
        
        const footer = document.createElement('div');
        footer.className = 'student-subject-footer';
        
        const badge = document.createElement('span');
        badge.className = hasStudents ? 'student-count-badge' : 'student-count-badge no-students';
        badge.textContent = hasStudents ? `${studentCount} students` : 'Not scraped';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'view-students-btn';
        viewBtn.textContent = 'View';
        viewBtn.disabled = !hasStudents;
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (hasStudents) {
                this.#viewStudents(subject);
            }
        });
        
        footer.appendChild(badge);
        footer.appendChild(viewBtn);
        
        card.appendChild(header);
        card.appendChild(footer);
        
        // Click card to toggle selection
        card.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            this.#toggleSubjectSelection(subject.id, checkbox.checked);
        });
        
        return card;
    }

    /**
     * Toggle subject selection
     * @param {string} subjectId - Subject ID
     * @param {boolean} selected - Selected state
     */
    #toggleSubjectSelection(subjectId, selected) {
        if (selected) {
            this.#selectedSubjectIds.add(subjectId);
        } else {
            this.#selectedSubjectIds.delete(subjectId);
        }
        this.#updateExtractStudentsButton();
        this.#renderStudentsSubjectList();
    }

    /**
     * Update extract students button state
     */
    #updateExtractStudentsButton() {
        this.#elements.extractStudentsBtn.disabled = this.#selectedSubjectIds.size === 0;
        const count = this.#selectedSubjectIds.size;
        const total = this.#suap.getMatchedSubjects().length;
        this.#elements.studentsSelectedCount.textContent = `${count} selected of ${total}`;
    }

    /**
     * Select all subjects
     */
    #selectAllSubjects() {
        const matchedSubjects = this.#suap.getMatchedSubjects();
        matchedSubjects.forEach(subject => {
            this.#selectedSubjectIds.add(subject.id);
        });
        this.#updateExtractStudentsButton();
        this.#renderStudentsSubjectList();
    }

    /**
     * Select subjects that haven't been scraped yet
     */
    #selectNotScraped() {
        const matchedSubjects = this.#suap.getMatchedSubjects();
        matchedSubjects.forEach(subject => {
            const enrollments = this.#studentsData.subjects?.[subject.id];
            if (!enrollments || enrollments.length === 0) {
                this.#selectedSubjectIds.add(subject.id);
            }
        });
        this.#updateExtractStudentsButton();
        this.#renderStudentsSubjectList();
    }

    /**
     * Deselect all subjects
     */
    #deselectAllSubjects() {
        this.#selectedSubjectIds.clear();
        this.#updateExtractStudentsButton();
        this.#renderStudentsSubjectList();
    }

    /**
     * View students for a subject
     * @param {Object} subject - SUAP subject
     */
    #viewStudents(subject) {
        const enrollments = this.#studentsData.subjects?.[subject.id] || [];
        const students = enrollments.map(enrollment => ({
            enrollment,
            ...this.#studentsData.students?.[enrollment]
        }));
        this.#studentsModal.show(subject, students, this.#studentUrl);
    }

    /**
     * Extract students from selected subjects
     */
    async #extractStudents() {
        if (this.#selectedSubjectIds.size === 0) return;
        
        this.#ui.updateButton(
            this.#elements.extractStudentsBtn,
            true,
            'Extracting...'
        );
        
        this.#progressModal.show({
            title: 'Extracting Students',
            message: 'Starting student extraction',
            warning: 'This process involves web scraping and may take several minutes.'
        });
        
        try {
            const subjectIds = Array.from(this.#selectedSubjectIds);
            
            // Start extraction job
            const response = await Request.post('/api/suap/extract-students', { subjectIds });
            
            if (!response.success || !response.jobId) {
                throw new Error(response.error || 'Failed to start extraction job');
            }
            
            // Poll for job completion
            const result = await this.#pollJobStatus(response.jobId, (status) => {
                const current = status.subject.current || 0;
                const total = subjectIds.length;
                const message = status.message || 'Processing...';
                
                // Format progress message with completion count
                const progressText = `${message}\n\nCompleted: ${current}/${total} subjects`;
                
                this.#progressModal.updateStatus(progressText);
            });
            
            this.#progressModal.hide();
            
            // Reload students data
            await this.#loadStudentsData();
            this.#selectedSubjectIds.clear();
            this.#renderStudentsSubjectList();
            this.#updateExtractStudentsButton();
            
            Toast.success(result.message || 'Students extracted successfully');
        } catch (error) {
            this.#progressModal.hide();
            console.error('Student extraction error:', error);
            Toast.error(error.message || 'Failed to extract students');
        } finally {
            this.#ui.updateButton(
                this.#elements.extractStudentsBtn,
                false,
                'Extract Students'
            );
        }
    }

    /**
     * Poll job status until completion
     * @param {string} jobId - Job ID
     * @param {Function} onProgress - Progress callback
     */
    async #pollJobStatus(jobId, onProgress) {
        const pollInterval = 1000; // 1 second
        const maxAttempts = 600; // 10 minutes max
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const status = await Request.get(`/api/jobs/${jobId}`);
                
                // Fire progress callback if there's any progress info (message, current, total)
                if (onProgress && (status.message || status.current !== undefined)) {
                    onProgress(status);
                }
                
                if (status.status === 'completed') {
                    return status.results;
                }
                
                if (status.status === 'failed') {
                    throw new Error(status.error || 'Job failed');
                }
                
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;
            } catch (error) {
                throw error;
            }
        }
        
        throw new Error('Job polling timeout');
    }
}

// Initialize the application
new SubjectMatcherApp();
