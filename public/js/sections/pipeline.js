import Toast from '../components/toast.js';
import ProgressModal from '../components/progress-modal.js';
import { getDefaultYearSemester } from '../helpers/date.js';

/**
 * Pipeline Section
 * Handles the data extraction and generation pipeline:
 * - Generate Moodle CSV from EduPage timetables
 * - Extract subjects from SUAP
 * - Upload courses to Moodle
 */
export default class PipelineSection {
    #elements = {};
    #moodle;
    #suap;
    #progressModal;
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

        this.#attachEventListeners();
        this.#setDefaultDateValues();
    }

    /**
     * Attach event listeners for pipeline actions
     */
    #attachEventListeners() {
        this.#elements.generateCsvBtn.addEventListener('click', () => this.#generateCourseCSV());
        this.#elements.extractSuapBtn.addEventListener('click', () => this.#extractSUAP());
        this.#elements.uploadCoursesBtn.addEventListener('click', () => this.#uploadCourses());
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
            const summary = result.results
                ? `Created: ${result.results.success.length}, Failed: ${result.results.errors.length}`
                : '';
            Toast.success((result.message || 'Courses uploaded successfully') + (summary ? '. ' + summary : ''));
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
