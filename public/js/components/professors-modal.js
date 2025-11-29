/**
 * Professors Modal Component
 * Displays professors scraped from a SUAP subject
 */
export class ProfessorsModal {
    #modalElement;
    #titleElement;
    #countElement;
    #listElement;
    #closeBtn;
    #currentSubject = null;

    constructor() {
        this.#createModal();
        this.#attachEventListeners();
    }

    /**
     * Create modal DOM structure
     */
    #createModal() {
        // Create modal container
        this.#modalElement = document.createElement('div');
        this.#modalElement.id = 'professors-modal';
        this.#modalElement.className = 'modal';
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content professors-modal-content';
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const headerInfo = document.createElement('div');
        headerInfo.className = 'professors-modal-header-info';
        
        this.#titleElement = document.createElement('h2');
        this.#titleElement.textContent = 'Professors';
        
        this.#countElement = document.createElement('span');
        this.#countElement.className = 'professors-count';
        
        headerInfo.appendChild(this.#titleElement);
        headerInfo.appendChild(this.#countElement);
        
        this.#closeBtn = document.createElement('button');
        this.#closeBtn.className = 'modal-close';
        this.#closeBtn.innerHTML = '&times;';
        
        modalHeader.appendChild(headerInfo);
        modalHeader.appendChild(this.#closeBtn);
        
        // Modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body professors-modal-body';
        
        this.#listElement = document.createElement('div');
        this.#listElement.className = 'professors-list';
        
        modalBody.appendChild(this.#listElement);
        
        // Assemble modal
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        this.#modalElement.appendChild(modalContent);
        
        // Add to document
        document.body.appendChild(this.#modalElement);
    }

    /**
     * Attach event listeners
     */
    #attachEventListeners() {
        // Close on X button
        this.#closeBtn.addEventListener('click', () => this.hide());
        
        // Close on outside click
        this.#modalElement.addEventListener('click', (e) => {
            if (e.target === this.#modalElement) {
                this.hide();
            }
        });
        
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.#modalElement.classList.contains('show')) {
                this.hide();
            }
        });
    }

    /**
     * Show modal with professor data
     * @param {Object} subject - SUAP subject object
     * @param {Array} professors - Array of professor objects
     * @param {string} url - URL template for professor profiles
     */
    show(subject, professors, url) {
        this.#currentSubject = subject;
        
        // Update title
        this.#titleElement.textContent = subject.fullname || subject.name;
        
        // Update count
        const count = professors.length;
        this.#countElement.textContent = `${count} professor${count !== 1 ? 's' : ''}`;
        
        // Render professors
        this.#renderProfessors(professors, url);
        
        // Show modal
        this.#modalElement.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide modal
     */
    hide() {
        this.#modalElement.classList.remove('show');
        document.body.style.overflow = '';
        this.#currentSubject = null;
    }

    /**
     * Render professor list
     * @param {Array} professors - Array of professor objects
     * @param {string} url - URL template for professor profiles
     */
    #renderProfessors(professors, url) {
        this.#listElement.innerHTML = '';
        
        if (!professors || professors.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'empty-message';
            emptyMsg.textContent = 'No professors found';
            this.#listElement.appendChild(emptyMsg);
            return;
        }
        
        professors.forEach(professor => {
            const professorCard = this.#createProfessorCard(professor, url);
            this.#listElement.appendChild(professorCard);
        });
    }

    /**
     * Create professor card element
     * @param {Object} professor - Professor object
     * @param {string} url - URL template for professor profiles
     * @returns {HTMLElement}
     */
    #createProfessorCard(professor, url) {
        const card = document.createElement('div');
        card.className = 'professor-card';
        
        const name = document.createElement('div');
        name.className = 'professor-name';
        name.textContent = professor.name;
        
        const email = document.createElement('div');
        email.className = 'professor-email';
        email.textContent = professor.email || 'No email';
        
        const siape = document.createElement('div');
        siape.className = 'professor-siape';
        siape.innerHTML = `<a href="${url.replace('{{siape}}', professor.siape)}" target="_blank" rel="noopener noreferrer">${professor.siape}</a>`;
        
        card.appendChild(name);
        card.appendChild(email);
        card.appendChild(siape);
        
        return card;
    }
}

export default ProfessorsModal;
