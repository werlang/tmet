import { Toast } from '../components/toast.js';
import { ProgressModal } from '../components/progress-modal.js';
import { getDefaultYearSemester } from '../helpers/date.js';

/**
 * Pipeline Section
 * Handles the data extraction and generation pipeline:
 * - Generate Moodle CSV from EduPage timetables
 * - Extract subjects from SUAP
 * - Upload courses to Moodle
 */
class PipelineSection {
    #elements = {};
    #moodle;
    #suap;
    #progressModal;
    #onDataChange;
    #manualCourses = [];

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

        this.#attachEventListeners();
        this.#setDefaultDateValues();
        this.#loadManualCourseCategories();
        this.#loadManualCoursesSummary();
    }

    /**
     * Attach event listeners for pipeline actions
     */
    #attachEventListeners() {
        this.#elements.generateCsvBtn.addEventListener('click', () => this.#generateCourseCSV());
        this.#elements.extractSuapBtn.addEventListener('click', () => this.#extractSUAP());
        this.#elements.uploadCoursesBtn.addEventListener('click', () => this.#uploadCourses());
        this.#elements.addManualCourseBtn?.addEventListener('click', () => this.#createManualCourse());
        this.#elements.generateManualCoursesCsvBtn?.addEventListener('click', () => this.#generateManualCoursesCSV());
    }

    async #loadManualCourseCategories() {
        if (!this.#elements.manualCourseCategorySelect) {
            return;
        }

        try {
            const categories = await this.#moodle.loadCourseCategories();
            const select = this.#elements.manualCourseCategorySelect;

            select.innerHTML = '<option value="">Select a category</option>';

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.key;
                option.textContent = category.label;
                select.appendChild(option);
            });
        } catch (error) {
            const select = this.#elements.manualCourseCategorySelect;
            select.innerHTML = '<option value="">Failed to load categories</option>';
        }
    }

    async #loadManualCoursesSummary() {
        if (!this.#elements.manualCoursesSummary) {
            return;
        }

        try {
            this.#manualCourses = await this.#moodle.loadManualCourses();
            this.#renderManualCoursesSummary();
        } catch (error) {
            this.#manualCourses = [];
            this.#renderManualCoursesSummary();
        }
    }

    #renderManualCoursesSummary() {
        const container = this.#elements.manualCoursesSummary;

        if (!container) {
            return;
        }

        container.innerHTML = '';

        if (this.#manualCourses.length === 0) {
            container.dataset.empty = 'true';
            container.textContent = 'No manual courses queued for CSV generation yet.';
            return;
        }

        delete container.dataset.empty;

        const summary = document.createElement('p');
        summary.className = 'manual-students-summary-copy';
        summary.textContent = `${this.#manualCourses.length} manual course${this.#manualCourses.length === 1 ? '' : 's'} queued for CSV generation.`;
        container.appendChild(summary);

        const list = document.createElement('div');
        list.className = 'manual-students-summary-list';

        this.#manualCourses
            .slice()
            .sort((left, right) => left.fullname.localeCompare(right.fullname))
            .forEach(course => {
                const card = document.createElement('article');
                card.className = 'manual-student-summary-card';

                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'manual-student-remove-btn';
                removeButton.textContent = 'X';
                removeButton.setAttribute('aria-label', `Remove ${course.fullname} from manual queue`);
                removeButton.addEventListener('click', async () => {
                    await this.#removeManualCourse(course.fullname);
                });

                const name = document.createElement('h4');
                name.className = 'manual-student-summary-name';
                name.textContent = course.fullname;

                const meta = document.createElement('p');
                meta.className = 'manual-student-summary-meta';
                meta.textContent = `${course.shortname} • Category ${course.category}`;

                card.appendChild(removeButton);
                card.appendChild(name);
                card.appendChild(meta);
                list.appendChild(card);
            });

        container.appendChild(list);
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
     * Generate CSV from timetables
     */
    async #generateCourseCSV() {
        this.#updateButton(
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
                this.#updateButton(
                    this.#elements.generateCsvBtn,
                    true,
                    message
                );
            });

            this.#progressModal.updateStatus('Reloading data');
            await this.#onDataChange();

            this.#progressModal.hide();
            Toast.success(result.message || 'CSV generated successfully');
        } catch (error) {
            this.#progressModal.hide();
            // Error already handled in Moodle
        } finally {
            this.#updateButton(
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
        this.#updateButton(
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
                this.#updateButton(
                    this.#elements.extractSuapBtn,
                    true,
                    message
                );
            });

            this.#progressModal.updateStatus('Reloading data');
            await this.#onDataChange();

            this.#progressModal.hide();
            Toast.success(result.message || 'SUAP data extracted successfully');
        } catch (error) {
            this.#progressModal.hide();
            // Error already handled in SUAP
        } finally {
            this.#updateButton(
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
        this.#updateButton(
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
                this.#updateButton(
                    this.#elements.uploadCoursesBtn,
                    true,
                    message
                );
            });

            this.#progressModal.hide();
            
            // Show detailed results
            const successCount = result.results?.success?.length || 0;
            const errorCount = result.results?.errors?.length || 0;
            
            // Format errors for Toast (domain-agnostic)
            const errors = (result.results?.errors || []).map(e => ({
                id: e.course || 'Unknown',
                message: e.error || e.message || 'Unknown error'
            }));
            
            Toast.showDetails({
                title: result.message || 'Course upload completed',
                successCount,
                skippedCount: 0,
                errorCount,
                errors,
                skipped: []
            });
        } catch (error) {
            this.#progressModal.hide();
            // Error already handled in Moodle
        } finally {
            this.#updateButton(
                this.#elements.uploadCoursesBtn,
                false,
                'Upload to Moodle'
            );
        }
    }

    async #createManualCourse() {
        const fullname = this.#elements.manualCourseFullnameInput?.value?.trim();
        const categoryKey = this.#elements.manualCourseCategorySelect?.value;

        if (!fullname) {
            Toast.error('Provide the manual course fullname.');
            return;
        }

        if (!categoryKey) {
            Toast.error('Select a Moodle category.');
            return;
        }

        this.#updateButton(
            this.#elements.addManualCourseBtn,
            true,
            'Adding...'
        );

        try {
            const result = await this.#moodle.createManualCourse({ fullname, categoryKey });
            await this.#loadManualCoursesSummary();

            this.#elements.manualCourseFullnameInput.value = '';
            this.#elements.manualCourseCategorySelect.value = '';
            Toast.success(result.message || `Manual Moodle course queued: ${result.course?.shortname || ''}`.trim());
        } catch (error) {
            // Error already handled in Moodle model
        } finally {
            this.#updateButton(
                this.#elements.addManualCourseBtn,
                false,
                'Add Manual Course'
            );
        }
    }

    async #generateManualCoursesCSV() {
        this.#updateButton(
            this.#elements.generateManualCoursesCsvBtn,
            true,
            'Generating...'
        );

        this.#progressModal.show({
            title: 'Generating Manual Courses CSV',
            message: 'Preparing manual course rows'
        });

        try {
            const result = await this.#moodle.generateManualCoursesCSV((message) => {
                this.#progressModal.updateStatus(message);
                this.#updateButton(this.#elements.generateManualCoursesCsvBtn, true, message);
            });

            await this.#onDataChange();
            await this.#loadManualCoursesSummary();
            this.#progressModal.hide();
            Toast.success(result.message || 'Manual courses CSV generated successfully');
        } catch (error) {
            this.#progressModal.hide();
        } finally {
            this.#updateButton(
                this.#elements.generateManualCoursesCsvBtn,
                false,
                'Generate Manual Courses CSV'
            );
        }
    }

    async #removeManualCourse(fullname) {
        try {
            const result = await this.#moodle.removeManualCourse({ fullname });
            await this.#loadManualCoursesSummary();
            Toast.success(result.message || `Manual Moodle course removed: ${fullname}`);
        } catch (error) {
            // Error already handled in Moodle model
        }
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

    updateUI() {
        this.#loadManualCoursesSummary();
    }
}

export { PipelineSection };
