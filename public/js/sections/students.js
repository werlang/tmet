import { Toast } from '../components/toast.js';
import { ProgressModal } from '../components/progress-modal.js';
import { StudentsModal } from '../components/students-modal.js';
import { ProfessorsModal } from '../components/professors-modal.js';
import { Request } from '../helpers/request.js';
import { removeAccents } from '../helpers/text.js';

/**
 * Students Section
 * Handles student extraction and management:
 * - Subject selection for extraction
 * - Student extraction from SUAP
 * - Student viewing modal
 * - Generate students CSV for Moodle enrollment
 */
class StudentsSection {
    #elements = {};
    #moodle;
    #suap;
    #progressModal;
    #studentsModal;
    #professorsModal;
    #selectedSubjectIds = new Set();
    #studentsData = {};
    #professorsData = {};
    #studentUrl = '';
    #professorUrl = '';
    #onDataChange;
    #showStudentsNotScrapedOnly = false;
    #showProfessorsNotScrapedOnly = false;
    #subjectFilter = '';

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
        this.#professorsModal = new ProfessorsModal();

        this.#attachEventListeners();
    }

    /**
     * Attach event listeners for students actions
     */
    #attachEventListeners() {
        // Extraction buttons
        this.#elements.extractStudentsBtn.addEventListener('click', () => this.#extractStudents('both'));
        this.#elements.extractStudentsOnlyBtn.addEventListener('click', () => this.#extractStudents('students'));
        this.#elements.extractProfessorsOnlyBtn.addEventListener('click', () => this.#extractStudents('professors'));
        
        // Students selection buttons
        this.#elements.selectAllStudentsBtn.addEventListener('click', () => this.#selectByType('students', 'all'));
        this.#elements.selectStudentsNotScrapedBtn.addEventListener('click', () => this.#selectByType('students', 'not-scraped'));
        this.#elements.deselectAllStudentsBtn.addEventListener('click', () => this.#selectByType('students', 'none'));
        
        // Professors selection buttons
        this.#elements.selectAllProfessorsBtn.addEventListener('click', () => this.#selectByType('professors', 'all'));
        this.#elements.selectProfessorsNotScrapedBtn.addEventListener('click', () => this.#selectByType('professors', 'not-scraped'));
        this.#elements.deselectAllProfessorsBtn.addEventListener('click', () => this.#selectByType('professors', 'none'));

        // Filter toggles
        this.#elements.filterStudentsNotScrapedToggle.addEventListener('change', (event) => {
            this.#showStudentsNotScrapedOnly = event.target.checked;
            this.#renderStudentsSubjectList();
        });
        this.#elements.filterProfessorsNotScrapedToggle.addEventListener('change', (event) => {
            this.#showProfessorsNotScrapedOnly = event.target.checked;
            this.#renderStudentsSubjectList();
        });
        this.#elements.studentsSubjectFilter.addEventListener('input', (event) => {
            this.#subjectFilter = event.target.value;
            this.#renderStudentsSubjectList();
        });
        
        // CSV generation
        this.#elements.generateStudentsCsvBtn.addEventListener('click', () => this.#generateStudentsCSV());
        this.#elements.generateProfessorsCsvBtn.addEventListener('click', () => this.#generateProfessorsCSV());
        
        // Upload to Moodle
        this.#elements.uploadStudentsBtn.addEventListener('click', () => this.#uploadStudents());
        this.#elements.uploadProfessorsBtn.addEventListener('click', () => this.#uploadProfessors());
    }

    /**
     * Load students data from API
     */
    async loadStudentsData() {
        try {
            const [studentsResponse, professorsResponse] = await Promise.all([
                new Request().get('/api/suap/students'),
                new Request().get('/api/suap/professors')
            ]);
            // format: {subjects: {id: [enrollments]}, students: {enrollment: info}}
            this.#studentsData = studentsResponse.data || { subjects: {}, students: {} };
            this.#studentUrl = studentsResponse.studentUrl;
            // format: {subjects: {id: [siapes]}, professors: {siape: info}}
            this.#professorsData = professorsResponse.data || { subjects: {}, professors: {} };
            this.#professorUrl = professorsResponse.professorUrl;
        } catch (error) {
            console.error('Error loading students/professors data:', error);
            this.#studentsData = { subjects: {}, students: {} };
            this.#professorsData = { subjects: {}, professors: {} };
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
     * Get professors from a subject
     * @param {string} subjectId - Subject ID
     * @returns {Array} - List of professor objects
     */
    #getProfessorsFromSubject(subjectId) {
        const siapes = this.#professorsData.subjects?.[subjectId] || [];
        return siapes.map(siape => ({
            siape,
            ...this.#professorsData.professors?.[siape]
        }));
    }

    /**
     * Render students subject list
     */
    #renderStudentsSubjectList() {
        const matchedSubjects = this.#suap.getMatchedSubjects();
        const filteredSubjects = this.#getFilteredSubjects(matchedSubjects);
        const container = this.#elements.studentsSubjectList;

        container.innerHTML = '';

        if (matchedSubjects.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'students-empty-state';
            emptyState.innerHTML = '<p><strong>No matched subjects yet</strong></p><p>Match subjects first in Step 3 before extracting students</p>';
            container.appendChild(emptyState);
            return;
        }

        if (filteredSubjects.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'students-empty-state';
            emptyState.innerHTML = `<p><strong>No subjects match current filters</strong></p><p>${this.#getEmptyFilterMessage()}</p>`;
            container.appendChild(emptyState);
            return;
        }

        filteredSubjects.forEach(subject => {
            const card = this.#createStudentSubjectCard(subject);
            container.appendChild(card);
        });
    }

    /**
     * Check if students are already scraped for a subject
     * @param {string} subjectId - Subject ID
     * @returns {boolean}
     */
    #hasStudentsScraped(subjectId) {
        const enrollments = this.#studentsData.subjects?.[subjectId];
        return !!enrollments && enrollments.length > 0;
    }

    /**
     * Check if professors are already scraped for a subject
     * @param {string} subjectId - Subject ID
     * @returns {boolean}
     */
    #hasProfessorsScraped(subjectId) {
        const siapes = this.#professorsData.subjects?.[subjectId];
        return !!siapes && siapes.length > 0;
    }

    /**
     * Apply list filters for not-scraped data
     * @param {Array} subjects - Matched subjects
     * @returns {Array}
     */
    #getFilteredSubjects(subjects) {
        const normalizedFilter = removeAccents(this.#subjectFilter.trim().toLowerCase());

        return subjects.filter(subject => {
            if (this.#showStudentsNotScrapedOnly && this.#hasStudentsScraped(subject.id)) {
                return false;
            }

            if (this.#showProfessorsNotScrapedOnly && this.#hasProfessorsScraped(subject.id)) {
                return false;
            }

             if (normalizedFilter && !this.#matchesSubjectFilter(subject, normalizedFilter)) {
                return false;
            }

            return true;
        });
    }

    /**
     * Check if a subject matches the current text filter
     * @param {Object} subject - SUAP subject
     * @param {string} normalizedFilter - Normalized filter text
     * @returns {boolean}
     */
    #matchesSubjectFilter(subject, normalizedFilter) {
        const searchText = [
            subject.fullname,
            subject.name,
            subject.subjectName,
            subject.className,
            subject.id
        ].filter(Boolean).join(' ').toLowerCase();

        return removeAccents(searchText).includes(normalizedFilter);
    }

    /**
     * Build the empty-state help text for active filters
     * @returns {string}
     */
    #getEmptyFilterMessage() {
        const suggestions = [];

        if (this.#subjectFilter.trim()) {
            suggestions.push('clear the search field');
        }

        if (this.#showStudentsNotScrapedOnly || this.#showProfessorsNotScrapedOnly) {
            suggestions.push('disable one or both toggles');
        }

        if (suggestions.length === 0) {
            return 'Adjust the current filters to show matching subjects.';
        }

        return `Try to ${suggestions.join(' or ')}.`;
    }

    /**
     * Create a subject card for student extraction
     * @param {Object} subject - SUAP subject
     */
    #createStudentSubjectCard(subject) {
        const enrollments = this.#studentsData.subjects?.[subject.id];
        const hasStudents = !!enrollments && enrollments.length > 0;
        const studentCount = hasStudents ? enrollments.length : 0;
        
        const siapes = this.#professorsData.subjects?.[subject.id];
        const hasProfessors = !!siapes && siapes.length > 0;
        const professorCount = hasProfessors ? siapes.length : 0;
        
        const isSelected = this.#selectedSubjectIds.has(subject.id);

        const card = document.createElement('div');
        card.className = 'student-subject-card';
        if (hasStudents) card.classList.add('has-students');
        if (hasProfessors) card.classList.add('has-professors');
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

        // Badge container for students and professors
        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'badge-container';

        // Student badge - clickable when has students
        const studentBadge = document.createElement('span');
        studentBadge.className = hasStudents ? 'student-count-badge clickable' : 'student-count-badge no-data';
        studentBadge.innerHTML = hasStudents 
            ? `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> ${studentCount}`
            : `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> -`;
        
        if (hasStudents) {
            studentBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#viewStudents(subject);
            });
        }

        // Professor badge - clickable when has professors
        const professorBadge = document.createElement('span');
        professorBadge.className = hasProfessors ? 'professor-count-badge clickable' : 'professor-count-badge no-data';
        professorBadge.innerHTML = hasProfessors
            ? `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg> ${professorCount}`
            : `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg> -`;
        
        if (hasProfessors) {
            professorBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#viewProfessors(subject);
            });
        }

        badgeContainer.appendChild(studentBadge);
        badgeContainer.appendChild(professorBadge);

        footer.appendChild(badgeContainer);

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
     * Update extract buttons state
     */
    #updateExtractStudentsButton() {
        const disabled = this.#selectedSubjectIds.size === 0;
        this.#elements.extractStudentsBtn.disabled = disabled;
        this.#elements.extractStudentsOnlyBtn.disabled = disabled;
        this.#elements.extractProfessorsOnlyBtn.disabled = disabled;
        const count = this.#selectedSubjectIds.size;
        const total = this.#suap.getMatchedSubjects().length;
        this.#elements.studentsSelectedCount.textContent = `${count} selected of ${total}`;
    }

    /**
     * Select subjects by type and mode
     * @param {'students'|'professors'} type - What data type to check
     * @param {'all'|'not-scraped'|'none'} mode - Selection mode
     */
    #selectByType(type, mode) {
        const matchedSubjects = this.#suap.getMatchedSubjects();
        
        if (mode === 'none') {
            // Deselect subjects based on type criteria
            matchedSubjects.forEach(subject => {
                if (type === 'students') {
                    const enrollments = this.#studentsData.subjects?.[subject.id];
                    const hasStudents = enrollments && enrollments.length > 0;
                    // Deselect all that have students (or all if checking students)
                    this.#selectedSubjectIds.delete(subject.id);
                } else {
                    const siapes = this.#professorsData.subjects?.[subject.id];
                    const hasProfessors = siapes && siapes.length > 0;
                    // Deselect all that have professors (or all if checking professors)
                    this.#selectedSubjectIds.delete(subject.id);
                }
            });
        } else {
            // Select subjects
            matchedSubjects.forEach(subject => {
                if (type === 'students') {
                    const enrollments = this.#studentsData.subjects?.[subject.id];
                    const hasStudents = enrollments && enrollments.length > 0;
                    if (mode === 'all' || (mode === 'not-scraped' && !hasStudents)) {
                        this.#selectedSubjectIds.add(subject.id);
                    }
                } else {
                    const siapes = this.#professorsData.subjects?.[subject.id];
                    const hasProfessors = siapes && siapes.length > 0;
                    if (mode === 'all' || (mode === 'not-scraped' && !hasProfessors)) {
                        this.#selectedSubjectIds.add(subject.id);
                    }
                }
            });
        }
        
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
     * View professors for a subject
     * @param {Object} subject - SUAP subject
     */
    #viewProfessors(subject) {
        const professors = this.#getProfessorsFromSubject(subject.id);
        this.#professorsModal.show(subject, professors, this.#professorUrl);
    }

    /**
     * Extract students from selected subjects
     */
    /**
     * Extract students and/or professors from SUAP
     * @param {'both'|'students'|'professors'} extractType - What to extract
     */
    async #extractStudents(extractType = 'both') {
        if (this.#selectedSubjectIds.size === 0) return;

        // Determine button, title and labels based on extractType
        const config = {
            both: {
                button: this.#elements.extractStudentsBtn,
                buttonLabel: 'Extract Both',
                title: 'Extracting Students & Professors',
                successMsg: 'Students and professors extracted successfully'
            },
            students: {
                button: this.#elements.extractStudentsOnlyBtn,
                buttonLabel: 'Students Only',
                title: 'Extracting Students',
                successMsg: 'Students extracted successfully'
            },
            professors: {
                button: this.#elements.extractProfessorsOnlyBtn,
                buttonLabel: 'Professors Only',
                title: 'Extracting Professors',
                successMsg: 'Professors extracted successfully'
            }
        }[extractType];

        this.#updateButton(config.button, true, 'Extracting...');

        this.#progressModal.show({
            title: config.title,
            message: 'Starting extraction',
            warning: 'This process involves web scraping and may take several minutes.'
        });

        try {
            const subjectIds = Array.from(this.#selectedSubjectIds);

            // Start extraction job with extractType
            const response = await new Request().post('/api/suap/extract-students', { 
                subjectIds,
                extractType 
            });

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

            // Reload students and professors data (loadStudentsData handles both)
            await this.loadStudentsData();
            
            this.#selectedSubjectIds.clear();
            this.#renderStudentsSubjectList();
            this.#updateExtractStudentsButton();

            Toast.success(result.message || config.successMsg);
        } catch (error) {
            this.#progressModal.hide();
            console.error('Extraction error:', error);
            Toast.error(error.message || 'Failed to extract data');
        } finally {
            this.#updateButton(config.button, false, config.buttonLabel);
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
     * Generate professors CSV for Moodle bulk enrollment
     */
    async #generateProfessorsCSV() {
        this.#updateButton(
            this.#elements.generateProfessorsCsvBtn,
            true,
            'Generating...'
        );

        this.#progressModal.show({
            title: 'Generating Professors CSV',
            message: 'Processing matched subjects and professors'
        });

        try {
            const result = await this.#moodle.generateProfessorsCSV((message) => {
                this.#progressModal.updateStatus(message);
                this.#updateButton(
                    this.#elements.generateProfessorsCsvBtn,
                    true,
                    message
                );
            });

            this.#progressModal.hide();
            Toast.success(result.message || 'Professors CSV generated successfully');
        } catch (error) {
            this.#progressModal.hide();
            // Error already handled in Moodle
        } finally {
            this.#updateButton(
                this.#elements.generateProfessorsCsvBtn,
                false,
                'Generate Professors CSV'
            );
        }
    }

    /**
     * Upload students to Moodle
     */
    async #uploadStudents() {
        this.#updateButton(
            this.#elements.uploadStudentsBtn,
            true,
            'Uploading...'
        );

        this.#progressModal.show({
            title: 'Uploading Students to Moodle',
            message: 'Preparing student enrollment data'
        });

        try {
            const result = await this.#moodle.uploadStudents((message) => {
                this.#progressModal.updateStatus(message);
                this.#updateButton(
                    this.#elements.uploadStudentsBtn,
                    true,
                    message
                );
            });

            this.#progressModal.hide();
            
            // Show detailed results
            const successCount = result.results?.success?.length || 0;
            const createdCount = result.results?.created?.length || 0;
            const skippedCount = result.results?.skipped?.length || 0;
            const errorCount = result.results?.errors?.length || 0;
            
            // Format errors and skipped for Toast (domain-agnostic)
            const errors = (result.results?.errors || []).map(e => ({
                id: e.student || e.user || 'Unknown',
                message: e.error || e.message || 'Unknown error'
            }));
            const skipped = (result.results?.skipped || []).map(s => ({
                id: s.student || s.user || 'Unknown',
                reason: s.reason || 'Unknown reason'
            }));
            
            Toast.showDetails({
                title: result.message || 'Student upload completed',
                successCount,
                createdCount,
                skippedCount,
                errorCount,
                errors,
                skipped
            });
        } catch (error) {
            this.#progressModal.hide();
            // Error already handled in Moodle
        } finally {
            this.#updateButton(
                this.#elements.uploadStudentsBtn,
                false,
                'Upload Students to Moodle'
            );
        }
    }

    /**
     * Upload professors to Moodle
     */
    async #uploadProfessors() {
        this.#updateButton(
            this.#elements.uploadProfessorsBtn,
            true,
            'Uploading...'
        );

        this.#progressModal.show({
            title: 'Uploading Professors to Moodle',
            message: 'Preparing professor enrollment data'
        });

        try {
            const result = await this.#moodle.uploadProfessors((message) => {
                this.#progressModal.updateStatus(message);
                this.#updateButton(
                    this.#elements.uploadProfessorsBtn,
                    true,
                    message
                );
            });

            this.#progressModal.hide();
            
            // Show detailed results
            const successCount = result.results?.success?.length || 0;
            const createdCount = result.results?.created?.length || 0;
            const skippedCount = result.results?.skipped?.length || 0;
            const errorCount = result.results?.errors?.length || 0;
            
            // Format errors and skipped for Toast (domain-agnostic)
            const errors = (result.results?.errors || []).map(e => ({
                id: e.professor || e.user || 'Unknown',
                message: e.error || e.message || 'Unknown error'
            }));
            const skipped = (result.results?.skipped || []).map(s => ({
                id: s.professor || s.user || 'Unknown',
                reason: s.reason || 'Unknown reason'
            }));
            
            Toast.showDetails({
                title: result.message || 'Professor upload completed',
                successCount,
                createdCount,
                skippedCount,
                errorCount,
                errors,
                skipped
            });
        } catch (error) {
            this.#progressModal.hide();
            // Error already handled in Moodle
        } finally {
            this.#updateButton(
                this.#elements.uploadProfessorsBtn,
                false,
                'Upload Professors to Moodle'
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
                const status = await new Request().get(`/api/jobs/${jobId}`);

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

export { StudentsSection };
