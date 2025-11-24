import Toast from './toast.js';
import Request from './request.js';

class SubjectMatcher {
    #moodleSubjects = [];
    #suapSubjects = [];
    #matchedSubjects = [];
    #selectedMoodle = null;
    #selectedSuap = []; // Changed to array for multi-select
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

    #attachEventListeners() {
        this.#elements.matchBtn.addEventListener('click', () => this.#performMatch());
        this.#elements.moodleSearch.addEventListener('input', (e) => this.#renderMoodleList(e.target.value));
        this.#elements.suapSearch.addEventListener('input', (e) => this.#renderSuapList(e.target.value));
        this.#elements.generateCsvBtn.addEventListener('click', () => this.#generateCSV());
        this.#elements.extractSuapBtn.addEventListener('click', () => this.#extractSUAP());
        this.#elements.uploadCoursesBtn.addEventListener('click', () => this.#uploadCourses());
        this.#elements.aiMatchBtn.addEventListener('click', () => this.#performAIMatching());
        this.#elements.matchedSectionHeader.addEventListener('click', () => this.#toggleMatchedList());
        this.#elements.modalCloseBtn.addEventListener('click', () => this.#closeModal());
        this.#elements.modalCancelBtn.addEventListener('click', () => this.#closeModal());
        this.#elements.modalApproveBtn.addEventListener('click', () => this.#applyAIMatches());
        
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
        
        // Handle multiple SUAP matches
        let suapContent = '';
        if (Array.isArray(subject.suapId)) {
            // Multiple matches
            suapContent = subject.suapId.map(id => {
                const suapSubject = subject.suapMatch?.find(s => s.id === id);
                return suapSubject ? suapSubject.fullname : `ID: ${id}`;
            }).map(name => `<div class="suap-match-item">${this.#escapeHtml(name)}</div>`).join('');
        } else {
            // Single match (legacy support)
            const suapName = subject.suapMatch ? subject.suapMatch.fullname : `ID: ${subject.suapId}`;
            suapContent = `<div class="suap-match-item">${this.#escapeHtml(suapName)}</div>`;
        }
        
        div.innerHTML = `
            <div class="matched-source">
                <div class="label">Moodle</div>
                <div class="name">${this.#escapeHtml(moodleName)}</div>
            </div>
            <div class="matched-arrow">↔</div>
            <div class="matched-target">
                <div class="label">SUAP ${Array.isArray(subject.suapId) && subject.suapId.length > 1 ? `(${subject.suapId.length})` : ''}</div>
                <div class="suap-matches">${suapContent}</div>
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
        // Toggle selection for multi-select
        const isSelected = element.classList.contains('selected');
        
        if (isSelected) {
            // Deselect
            element.classList.remove('selected');
            this.#selectedSuap = this.#selectedSuap.filter(id => id !== subject.id);
        } else {
            // Select
            element.classList.add('selected');
            this.#selectedSuap.push(subject.id);
        }
        
        this.#updateMatchButton();
    }

    #clearSelection(selector) {
        document.querySelectorAll(`${selector} .subject-item`).forEach(item => {
            item.classList.remove('selected');
        });
    }

    #updateMatchButton() {
        this.#elements.matchBtn.disabled = !(this.#selectedMoodle && this.#selectedSuap.length > 0);
    }

    async #performMatch() {
        if (!this.#selectedMoodle || this.#selectedSuap.length === 0) return;
        
        const matchCount = this.#selectedSuap.length;
        
        try {
            await Request.post('/api/match', {
                moodleFullname: this.#selectedMoodle, 
                suapIds: this.#selectedSuap
            });
            
            this.#selectedMoodle = null;
            this.#selectedSuap = [];
            Toast.success(`Match saved successfully (1 Moodle → ${matchCount} SUAP).`);
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

    async #performAIMatching() {
        if (this.#moodleSubjects.length === 0) {
            Toast.error('No unmatched Moodle subjects available for AI matching');
            return;
        }

        if (this.#suapSubjects.length === 0) {
            Toast.error('No unmatched SUAP subjects available for AI matching');
            return;
        }

        this.#elements.aiMatchBtn.disabled = true;
        this.#elements.aiMatchBtn.textContent = '🤖 Starting...';
        
        try {
            // Start the AI matching job
            const result = await Request.post('/api/ai-match', {
                moodleSubjects: this.#moodleSubjects,
                suapSubjects: this.#suapSubjects
            });
            
            if (!result.success || !result.jobId) {
                throw new Error('Failed to start AI matching job');
            }

            // Poll for job completion
            this.#pollAIMatchingJob(result.jobId);

        } catch (error) {
            console.error('AI matching error:', error);
            Toast.error('Error during AI matching: ' + error.message);
            this.#elements.aiMatchBtn.disabled = false;
            this.#elements.aiMatchBtn.textContent = '🤖 AI-Powered Matching';
        }
    }

    async #pollAIMatchingJob(jobId) {
        const pollInterval = 1000; // Poll every 1 second
        const maxAttempts = 600; // Max 10 minutes of polling
        let attempts = 0;

        const poll = async () => {
            try {
                attempts++;
                const status = await Request.get(`/api/ai-match/${jobId}`);

                if (!status.success) {
                    throw new Error('Failed to fetch job status');
                }

                // Update button with progress
                if (status.progress !== undefined) {
                    this.#elements.aiMatchBtn.textContent = `🤖 ${status.progress}%${status.message ? ' - ' + status.message : ''}`;
                }

                if (status.status === 'completed') {
                    // Job completed successfully
                    this.#elements.aiMatchBtn.disabled = false;
                    this.#elements.aiMatchBtn.textContent = '🤖 AI-Powered Matching';

                    if (!status.matches || status.matches.length === 0) {
                        Toast.info('AI could not find confident matches for the remaining subjects');
                        return;
                    }

                    this.#showAIMatchModal(status.matches);
                    return;
                }

                if (status.status === 'failed') {
                    // Job failed
                    throw new Error(status.error || 'AI matching job failed');
                }

                // Job still processing, continue polling
                if (attempts >= maxAttempts) {
                    throw new Error('AI matching timed out');
                }

                setTimeout(poll, pollInterval);

            } catch (error) {
                console.error('Polling error:', error);
                Toast.error('Error checking AI matching status: ' + error.message);
                this.#elements.aiMatchBtn.disabled = false;
                this.#elements.aiMatchBtn.textContent = '🤖 AI-Powered Matching';
            }
        };

        // Start polling
        poll();
    }

    #showAIMatchModal(matches) {
        this.#elements.aiSuggestionsList.innerHTML = '';
        
        matches.forEach((match, index) => {
            const item = this.#createAISuggestionItem(match, index);
            this.#elements.aiSuggestionsList.appendChild(item);
        });
        
        this.#elements.aiMatchModal.classList.add('show');
    }

    #createAISuggestionItem(match, index) {
        const div = document.createElement('div');
        div.className = 'ai-suggestion-item';
        
        // Store match data on the element for later retrieval
        div._matchData = match;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.id = `ai-match-${index}`;
        checkbox.className = 'ai-match-checkbox';
        
        const label = document.createElement('label');
        label.htmlFor = `ai-match-${index}`;
        label.className = 'ai-match-label';
        
        const moodleName = match.moodleFullname.replace(/"/g, '');
        const suapNames = match.suapIds.map(id => {
            const suap = this.#suapSubjects.find(s => s.id === id);
            return suap ? suap.fullname : `ID: ${id}`;
        }).join(' + ');
        
        label.innerHTML = `
            <div class="match-pair">
                <div class="match-source">
                    <strong>Moodle:</strong> ${this.#escapeHtml(moodleName)}
                </div>
                <div class="match-arrow">→</div>
                <div class="match-target">
                    <strong>SUAP:</strong> ${this.#escapeHtml(suapNames)}
                </div>
            </div>
            ${match.reason ? `<div class="match-reason"><em>Reason:</em> ${this.#escapeHtml(match.reason)}</div>` : ''}
        `;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        
        return div;
    }

    #closeModal() {
        this.#elements.aiMatchModal.classList.remove('show');
    }

    async #applyAIMatches() {
        const checkboxes = this.#elements.aiSuggestionsList.querySelectorAll('.ai-match-checkbox:checked');
        const matches = [];
        
        checkboxes.forEach((checkbox) => {
            const suggestionItem = checkbox.closest('.ai-suggestion-item');
            const matchData = suggestionItem._matchData;
            if (matchData) {
                matches.push(matchData);
            }
        });
        
        if (matches.length === 0) {
            Toast.info('No matches selected');
            this.#closeModal();
            return;
        }

        this.#elements.modalApproveBtn.disabled = true;
        this.#elements.modalApproveBtn.textContent = 'Applying...';
        
        try {
            // Apply each match
            for (const match of matches) {
                await Request.post('/api/match', {
                    moodleFullname: match.moodleFullname,
                    suapIds: match.suapIds
                });
            }
            
            Toast.success(`Successfully applied ${matches.length} AI-suggested match(es)`);
            this.#closeModal();
            await this.#loadData();
        } catch (error) {
            console.error('Error applying AI matches:', error);
            Toast.error('Error applying matches: ' + error.message);
        } finally {
            this.#elements.modalApproveBtn.disabled = false;
            this.#elements.modalApproveBtn.textContent = 'Apply Selected Matches';
        }
    }
}

// Initialize the application
new SubjectMatcher();
