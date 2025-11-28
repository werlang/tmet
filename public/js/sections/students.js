import Toast from '../components/toast.js';
import ProgressModal from '../components/progress-modal.js';
import StudentsModal from '../components/students-modal.js';
import Request from '../helpers/request.js';

/**
 * Students Section
 * Handles student extraction and management:
 * - Subject selection for extraction
 * - Student extraction from SUAP
 * - Student viewing modal
 * - Generate students CSV for Moodle enrollment
 */
export default class StudentsSection {
    #elements = {};
    #moodle;
    #suap;
    #progressModal;
    #studentsModal;
    #selectedSubjectIds = new Set();
    #studentsData = {};
    #studentUrl = '';
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
        this.#progressModal = new ProgressModal();
        this.#studentsModal = new StudentsModal();

        this.#attachEventListeners();
    }

    /**
     * Attach event listeners for students actions
     */
    #attachEventListeners() {
        this.#elements.extractStudentsBtn.addEventListener('click', () => this.#extractStudents());
        this.#elements.selectAllStudentsBtn.addEventListener('click', () => this.#selectAllSubjects());
        this.#elements.selectNotScrapedBtn.addEventListener('click', () => this.#selectNotScraped());
        this.#elements.deselectAllStudentsBtn.addEventListener('click', () => this.#deselectAllSubjects());
        this.#elements.generateStudentsCsvBtn.addEventListener('click', () => this.#generateStudentsCSV());
    }

    /**
     * Load students data from API
     */
    async loadStudentsData() {
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
     * Update the UI with current data
     */
    updateUI() {
        this.#renderStudentsSubjectList();
        this.#updateExtractStudentsButton();
    }

    /**
     * Get students from a subject
     * @param {string} subjectId - Subject ID
     * @returns {Array} - List of student objects
     */
    #getStudentsFromSubject(subjectId) {
        const enrollments = this.#studentsData.subjects?.[subjectId] || [];
        return enrollments.map(enrollment => ({
            enrollment,
            ...this.#studentsData.students?.[enrollment]
        }));
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
        const students = this.#getStudentsFromSubject(subject.id);
        this.#studentsModal.show(subject, students, this.#studentUrl);
    }

    /**
     * Extract students from selected subjects
     */
    async #extractStudents() {
        if (this.#selectedSubjectIds.size === 0) return;

        this.#updateButton(
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
            await this.loadStudentsData();
            this.#selectedSubjectIds.clear();
            this.#renderStudentsSubjectList();
            this.#updateExtractStudentsButton();

            Toast.success(result.message || 'Students extracted successfully');
        } catch (error) {
            this.#progressModal.hide();
            console.error('Student extraction error:', error);
            Toast.error(error.message || 'Failed to extract students');
        } finally {
            this.#updateButton(
                this.#elements.extractStudentsBtn,
                false,
                'Extract Students'
            );
        }
    }

    /**
     * Generate students CSV for Moodle bulk enrollment
     */
    async #generateStudentsCSV() {
        this.#updateButton(
            this.#elements.generateStudentsCsvBtn,
            true,
            'Generating...'
        );

        this.#progressModal.show({
            title: 'Generating Students CSV',
            message: 'Processing matched subjects and students'
        });

        try {
            const result = await this.#moodle.generateStudentsCSV((message) => {
                this.#progressModal.updateStatus(message);
                this.#updateButton(
                    this.#elements.generateStudentsCsvBtn,
                    true,
                    message
                );
            });

            this.#progressModal.hide();
            Toast.success(result.message || 'Students CSV generated successfully');
        } catch (error) {
            this.#progressModal.hide();
            // Error already handled in Moodle
        } finally {
            this.#updateButton(
                this.#elements.generateStudentsCsvBtn,
                false,
                'Generate Students CSV'
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
