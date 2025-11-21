import Toast from './toast.js';
import Request from './request.js';

class SubjectMatcher {
    #moodleSubjects = [];
    #suapSubjects = [];
    #matchedSubjects = [];
    #selectedMoodle = null;
    #selectedSuap = null;
    #elements = {};

    constructor() {
        this.#cacheElements();
        this.#attachEventListeners();
        this.#initialize();
    }

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
            ttYearInput: document.getElementById('tt-year-input'),
            ttSemesterInput: document.getElementById('tt-semester-input'),
            dateFromInput: document.getElementById('date-from-input'),
            dateToInput: document.getElementById('date-to-input'),
            suapYearInput: document.getElementById('suap-year-input'),
            suapSemesterInput: document.getElementById('suap-semester-input'),
            coursesCheckboxes: document.getElementById('courses-checkboxes'),
            matchedSectionHeader: document.getElementById('matched-section-header'),
        };
    }

    #attachEventListeners() {
        this.#elements.matchBtn.addEventListener('click', () => this.#performMatch());
        this.#elements.moodleSearch.addEventListener('input', (e) => this.#renderMoodleList(e.target.value));
        this.#elements.suapSearch.addEventListener('input', (e) => this.#renderSuapList(e.target.value));
        this.#elements.generateCsvBtn.addEventListener('click', () => this.#generateCSV());
        this.#elements.extractSuapBtn.addEventListener('click', () => this.#extractSUAP());
        this.#elements.uploadCoursesBtn.addEventListener('click', () => this.#uploadCourses());
        this.#elements.matchedSectionHeader.addEventListener('click', () => this.#toggleMatchedList());
        
        // Set default values for year and semester
        this.#setDefaultDateValues();
    }

    #setDefaultDateValues() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 0-indexed
        
        // Default to current year
        this.#elements.ttYearInput.value = currentYear;
        this.#elements.suapYearInput.value = currentYear;
        
        // Default semester based on current month (1-6 = semester 1, 7-12 = semester 2)
        const currentSemester = currentMonth <= 6 ? 1 : 2;
        this.#elements.ttSemesterInput.value = currentSemester;
        this.#elements.suapSemesterInput.value = currentSemester;
    }

    async #initialize() {
        try {
            await this.#loadData();
        } catch (error) {
            console.error('Initialization error:', error);
            this.#showError('Failed to initialize application. Please refresh the page.');
        }
    }

    async #loadData() {
        try {
            const data = await Request.get('/api/data');
            
            this.#moodleSubjects = data.noMatch;
            this.#suapSubjects = this.#filterUnmatchedSuapSubjects(data.suapSubjects, data.subjects);
            this.#matchedSubjects = data.subjects.filter(s => s.suapId);
            
            this.#updateUI();
        } catch (error) {
            console.error('Data loading error:', error);
            this.#showError('Error loading data. Make sure the server is running and files exist.');
        }
    }

    #filterUnmatchedSuapSubjects(suapSubjects, allSubjects) {
        const matchedIds = new Set(allSubjects.filter(s => s.suapId).map(s => s.suapId));
        return suapSubjects.filter(s => !matchedIds.has(s.id));
    }

    #updateUI() {
        this.#updateStats();
        this.#renderMoodleList(this.#elements.moodleSearch.value);
        this.#renderSuapList(this.#elements.suapSearch.value);
        this.#renderMatchedList();
    }

    #updateStats() {
        const total = this.#moodleSubjects.length + this.#matchedSubjects.length;
        const percent = total === 0 ? 0 : (100 * this.#matchedSubjects.length / total).toFixed(2);
        this.#elements.matchedCount.textContent = `${this.#matchedSubjects.length} / ${total} (${percent}%)`;
        this.#elements.matchedListCount.textContent = this.#matchedSubjects.length;
    }

    #renderMoodleList(filter = '') {
        this.#elements.moodleList.innerHTML = '';
        
        this.#moodleSubjects.forEach(subject => {
            const item = this.#createMoodleItem(subject, filter);
            this.#elements.moodleList.appendChild(item);
        });
    }

    #removeAccents(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    #createMoodleItem(subject, filter = '') {
        const fullname = subject.fullname.replace(/"/g, '');
        const searchText = `${fullname} ${subject.shortname} ${subject.category}`.toLowerCase();
        
        const div = document.createElement('div');
        div.className = 'subject-item';
        
        // search accent insensitive
        if (filter && !this.#removeAccents(searchText).includes(this.#removeAccents(filter.toLowerCase()))) {
            div.classList.add('hidden');
        }
        
        div.innerHTML = `
            <div class="subject-title">${this.#escapeHtml(fullname)}</div>
            <div class="subject-details">${this.#escapeHtml(subject.shortname)} • Category: ${this.#escapeHtml(subject.category)}</div>
        `;
        
        div.addEventListener('click', () => this.#selectMoodle(div, subject));
        
        return div;
    }

    #renderSuapList(filter = '') {
        this.#elements.suapList.innerHTML = '';
        
        this.#suapSubjects.forEach(subject => {
            const item = this.#createSuapItem(subject, filter);
            this.#elements.suapList.appendChild(item);
        });
    }

    #createSuapItem(subject, filter = '') {
        const searchText = `${subject.fullname} ${subject.subjectName} ${subject.className}`.toLowerCase();
        
        const div = document.createElement('div');
        div.className = 'subject-item';
        
        // search accent insensitive
        if (filter && !this.#removeAccents(searchText).includes(this.#removeAccents(filter.toLowerCase()))) {
            div.classList.add('hidden');
        }
        
        div.innerHTML = `
            <div class="subject-title">${this.#escapeHtml(subject.fullname)}</div>
            <div class="subject-details">ID: ${this.#escapeHtml(subject.id)} • ${this.#escapeHtml(subject.subjectName)}</div>
        `;
        
        div.addEventListener('click', () => this.#selectSuap(div, subject));
        
        return div;
    }

    #renderMatchedList() {
        this.#elements.matchedList.innerHTML = '';
        
        this.#matchedSubjects.forEach(subject => {
            const item = this.#createMatchedItem(subject);
            this.#elements.matchedList.appendChild(item);
        });
    }

    #createMatchedItem(subject) {
        const div = document.createElement('div');
        div.className = 'matched-item';
        
        const moodleName = subject.fullname.replace(/"/g, '');
        const suapName = subject.suapMatch ? subject.suapMatch.fullname : `ID: ${subject.suapId}`;
        
        div.innerHTML = `
            <div class="matched-source">
                <div class="label">Moodle</div>
                <div class="name">${this.#escapeHtml(moodleName)}</div>
            </div>
            <div class="matched-arrow">↔</div>
            <div class="matched-target">
                <div class="label">SUAP</div>
                <div class="name">${this.#escapeHtml(suapName)}</div>
            </div>
        `;
        
        return div;
    }

    #selectMoodle(element, subject) {
        this.#clearSelection('#moodle-list');
        
        element.classList.add('selected');
        this.#selectedMoodle = subject.fullname;
        
        this.#updateMatchButton();
    }

    #selectSuap(element, subject) {
        this.#clearSelection('#suap-list');
        
        element.classList.add('selected');
        this.#selectedSuap = subject.id;
        
        this.#updateMatchButton();
    }

    #clearSelection(selector) {
        document.querySelectorAll(`${selector} .subject-item`).forEach(item => {
            item.classList.remove('selected');
        });
    }

    #updateMatchButton() {
        this.#elements.matchBtn.disabled = !(this.#selectedMoodle && this.#selectedSuap);
    }

    async #performMatch() {
        if (!this.#selectedMoodle || !this.#selectedSuap) return;
        
        try {
            await Request.post('/api/match', {
                moodleFullname: this.#selectedMoodle, 
                suapId: this.#selectedSuap
            });
            
            this.#selectedMoodle = null;
            this.#selectedSuap = null;
            Toast.success('Match saved successfully.');
            await this.#loadData();
        } catch (error) {
            console.error('Match error:', error);
            this.#showError('Error saving match. Please try again.');
        }
    }

    #escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    #showError(message) {
        Toast.error(message);
    }

    #toggleMatchedList() {
        this.#elements.matchedSectionHeader.classList.toggle('collapsed');
        this.#elements.matchedList.classList.toggle('collapsed');
    }

    async #generateCSV() {
        this.#elements.generateCsvBtn.disabled = true;
        this.#elements.generateCsvBtn.textContent = 'Extracting & Generating...';
        
        try {
            // Collect input values
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
            
            const result = await Request.post('/api/generate-csv', payload);
            Toast.success(result.message || 'Timetables extracted and CSV generated successfully');
            await this.#loadData();
        } catch (error) {
            console.error('Generate CSV error:', error);
            Toast.error('Error generating CSV: ' + error.message);
        } finally {
            this.#elements.generateCsvBtn.disabled = false;
            this.#elements.generateCsvBtn.textContent = 'Extract & Generate CSV';
        }
    }

    async #extractSUAP() {
        this.#elements.extractSuapBtn.disabled = true;
        this.#elements.extractSuapBtn.textContent = 'Extracting...';
        
        try {
            // Collect input values
            const payload = {};
            
            if (this.#elements.suapYearInput.value) {
                payload.year = parseInt(this.#elements.suapYearInput.value);
            }
            
            if (this.#elements.suapSemesterInput.value) {
                payload.semester = parseInt(this.#elements.suapSemesterInput.value);
            }
            
            // Collect selected courses from checkboxes
            const selectedCourses = Array.from(
                this.#elements.coursesCheckboxes.querySelectorAll('input[type="checkbox"]:checked')
            ).map(cb => cb.value);
            
            if (selectedCourses.length > 0) {
                payload.courses = selectedCourses;
            }
            
            const result = await Request.post('/api/extract-suap', payload);
            Toast.success(result.message || 'SUAP data extracted successfully');
            await this.#loadData();
        } catch (error) {
            console.error('Extract SUAP error:', error);
            Toast.error('Error extracting SUAP: ' + error.message);
        } finally {
            this.#elements.extractSuapBtn.disabled = false;
            this.#elements.extractSuapBtn.textContent = 'Extract from SUAP';
        }
    }

    async #uploadCourses() {
        this.#elements.uploadCoursesBtn.disabled = true;
        this.#elements.uploadCoursesBtn.textContent = 'Uploading...';
        
        try {
            const result = await Request.post('/api/upload-courses');
            const summary = result.results 
                ? `Created: ${result.results.success.length}, Failed: ${result.results.errors.length}`
                : 'Courses uploaded';
            Toast.success(result.message + '. ' + summary);
        } catch (error) {
            console.error('Upload courses error:', error);
            Toast.error('Error uploading courses: ' + error.message);
        } finally {
            this.#elements.uploadCoursesBtn.disabled = false;
            this.#elements.uploadCoursesBtn.textContent = 'Upload to Moodle';
        }
    }
}

// Initialize the application
new SubjectMatcher();
