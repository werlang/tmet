/**
 * Students Modal Component
 * Displays students scraped from a SUAP subject
 */
export class StudentsModal {
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
        this.#modalElement.id = 'students-modal';
        this.#modalElement.className = 'modal';
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content students-modal-content';
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const headerInfo = document.createElement('div');
        headerInfo.className = 'students-modal-header-info';
        
        this.#titleElement = document.createElement('h2');
        this.#titleElement.textContent = 'Students';
        
        this.#countElement = document.createElement('span');
        this.#countElement.className = 'students-count';
        
        headerInfo.appendChild(this.#titleElement);
        headerInfo.appendChild(this.#countElement);
        
        this.#closeBtn = document.createElement('button');
        this.#closeBtn.className = 'modal-close';
        this.#closeBtn.innerHTML = '&times;';
        
        modalHeader.appendChild(headerInfo);
        modalHeader.appendChild(this.#closeBtn);
        
        // Modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body students-modal-body';
        
        this.#listElement = document.createElement('div');
        this.#listElement.className = 'students-list';
        
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
     * Show modal with student data
     * @param {Object} subject - SUAP subject object
     * @param {Array} students - Array of student objects
     */
    show(subject, students, url) {
        this.#currentSubject = subject;
        
        // Update title
        this.#titleElement.textContent = subject.fullname || subject.name;
        
        // Update count
        const count = students.length;
        this.#countElement.textContent = `${count} student${count !== 1 ? 's' : ''}`;
        
        // Render students
        this.#renderStudents(students, url);
        
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
     * Render student list
     * @param {Array} students - Array of student objects
     */
    #renderStudents(students, url) {
        this.#listElement.innerHTML = '';
        
        if (!students || students.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'empty-message';
            emptyMsg.textContent = 'No students found';
            this.#listElement.appendChild(emptyMsg);
            return;
        }
        
        students.forEach(student => {
            const studentCard = this.#createStudentCard(student, url);
            this.#listElement.appendChild(studentCard);
        });
    }

    /**
     * Create student card element
     * @param {Object} student - Student object
     * @returns {HTMLElement}
     */
    #createStudentCard(student, url) {
        const card = document.createElement('div');
        card.className = 'student-card';
        
        const name = document.createElement('div');
        name.className = 'student-name';
        name.textContent = student.name;
        
        const email = document.createElement('div');
        email.className = 'student-email';
        email.textContent = student.email;
        
        const enrollment = document.createElement('div');
        enrollment.className = 'student-enrollment';
        enrollment.innerHTML = `<a href="${url.replace('{{enrollment}}', student.enrollment)}" target="_blank" rel="noopener noreferrer">${student.enrollment}</a>`;
        
        card.appendChild(name);
        card.appendChild(email);
        card.appendChild(enrollment);
        
        return card;
    }
}

export default StudentsModal;
