/**
 * Progress Modal Component
 * Displays progress feedback for long-running operations
 * Shows loading spinner, status messages, elapsed time, and warnings
 * Singleton pattern to prevent multiple instances
 */
export class ProgressModal {
    static #instance = null;
    #modal = null;
    #elements = {};
    #startTime = null;
    #timerInterval = null;

    constructor() {
        // Singleton pattern - return existing instance if already created
        if (ProgressModal.#instance) {
            return ProgressModal.#instance;
        }

        this.#createModal();
        this.#cacheElements();
        ProgressModal.#instance = this;
    }

    /**
     * Create modal structure and inject into DOM
     */
    #createModal() {
        const modal = document.createElement('div');
        modal.className = 'progress-modal';
        modal.innerHTML = `
            <div class="progress-modal-content">
                <div class="progress-spinner">
                    <div class="tmet-spinner">
                        <div class="tmet-spinner-inner"></div>
                    </div>
                </div>
                <div class="progress-title">Processing...</div>
                <div class="progress-status">Starting task...</div>
                <div class="progress-elapsed">Elapsed time: 0s</div>
                <div class="progress-warning"></div>
            </div>
        `;
        document.body.appendChild(modal);
        this.#modal = modal;
    }

    /**
     * Cache DOM elements
     */
    #cacheElements() {
        this.#elements = {
            title: this.#modal.querySelector('.progress-title'),
            status: this.#modal.querySelector('.progress-status'),
            elapsed: this.#modal.querySelector('.progress-elapsed'),
            warning: this.#modal.querySelector('.progress-warning'),
        };
    }

    /**
     * Show progress modal
     * @param {Object} options - Configuration options
     * @param {string} options.title - Modal title
     * @param {string} options.message - Initial status message
     * @param {string} options.warning - Warning message (optional)
     */
    show({ title = 'Processing...', message = 'Starting task...', warning = '' } = {}) {
        this.#elements.title.textContent = title;
        this.#elements.status.textContent = message;
        
        if (warning) {
            this.#elements.warning.textContent = warning;
            this.#elements.warning.style.display = 'block';
        } else {
            this.#elements.warning.style.display = 'none';
        }

        this.#modal.classList.add('show');
        this.#startTime = Date.now();
        this.#startTimer();
    }

    /**
     * Update status message
     * @param {string} message - New status message
     */
    updateStatus(message) {
        this.#elements.status.textContent = message;
    }

    /**
     * Start elapsed time timer
     */
    #startTimer() {
        this.#timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.#startTime) / 1000);
            this.#elements.elapsed.textContent = this.#formatElapsedTime(elapsed);
        }, 1000);
    }

    /**
     * Format elapsed time as human-readable string
     * @param {number} seconds - Elapsed seconds
     * @returns {string}
     */
    #formatElapsedTime(seconds) {
        if (seconds < 60) {
            return `Elapsed time: ${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `Elapsed time: ${minutes}m ${remainingSeconds}s`;
    }

    /**
     * Hide progress modal and cleanup timers
     */
    hide() {
        this.#modal.classList.remove('show');
        
        if (this.#timerInterval) {
            clearInterval(this.#timerInterval);
            this.#timerInterval = null;
        }
        
        this.#startTime = null;
    }

    /**
     * Check if modal is currently visible
     * @returns {boolean}
     */
    isVisible() {
        return this.#modal.classList.contains('show');
    }
}
