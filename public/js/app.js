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
        };
    }

    #attachEventListeners() {
        this.#elements.matchBtn.addEventListener('click', () => this.#performMatch());
        this.#elements.moodleSearch.addEventListener('input', (e) => this.#renderMoodleList(e.target.value));
        this.#elements.suapSearch.addEventListener('input', (e) => this.#renderSuapList(e.target.value));
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
}

// Initialize the application
new SubjectMatcher();
