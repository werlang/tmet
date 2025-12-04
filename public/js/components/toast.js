export default class Toast {
    static #container = null;

    static #init() {
        if (!this.#container) {
            this.#container = document.createElement('div');
            this.#container.id = 'toast-container';
            document.body.appendChild(this.#container);
        }
    }

    static show(message, type = 'error', duration = 5000) {
        this.#init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.#getIcon(type);
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${this.#escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Close">×</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.#remove(toast));

        this.#container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('toast-show'), 10);

        // Auto-remove
        if (duration > 0) {
            setTimeout(() => this.#remove(toast), duration);
        }

        return toast;
    }

    static #remove(toast) {
        toast.classList.remove('toast-show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }

    static #getIcon(type) {
        const icons = {
            error: '⚠️',
            success: '✓',
            info: 'ℹ️',
            warning: '⚠️'
        };
        return icons[type] || icons.info;
    }

    static #escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static error(message, duration) {
        return this.show(message, 'error', duration);
    }

    static success(message, duration) {
        return this.show(message, 'success', duration);
    }

    static info(message, duration) {
        return this.show(message, 'info', duration);
    }

    static warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Show upload results with expandable error details
     * @param {Object} options - Result options
     * @param {string} options.title - Main message
     * @param {number} options.successCount - Number of successful items
     * @param {number} options.createdCount - Number of created items (e.g., new users)
     * @param {number} options.skippedCount - Number of skipped items
     * @param {number} options.errorCount - Number of errors
     * @param {Array} options.errors - Array of {id, message} objects
     * @param {Array} options.skipped - Array of {id, reason} objects
     */
    static showDetails({ title, successCount = 0, createdCount = 0, skippedCount = 0, errorCount = 0, errors = [], skipped = [] }) {
        this.#init();

        const hasIssues = errorCount > 0 || skippedCount > 0;
        const type = errorCount > 0 && successCount === 0 ? 'error' : hasIssues ? 'warning' : 'success';
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-expandable`;
        
        const icon = this.#getIcon(type);
        const summaryParts = [`${successCount} enrolled`];
        if (createdCount > 0) summaryParts.push(`${createdCount} created`);
        summaryParts.push(`${skippedCount} skipped`, `${errorCount} errors`);
        const summary = summaryParts.join(', ');
        
        let detailsHtml = '';
        if (hasIssues) {
            detailsHtml = `
                <div class="toast-details">
                    <button class="toast-toggle" aria-label="Toggle details">Show details ▼</button>
                    <div class="toast-details-content" style="display: none;">`;
            
            if (errors.length > 0) {
                detailsHtml += `<div class="toast-section"><strong>Errors:</strong><ul>`;
                errors.slice(0, 10).forEach(err => {
                    detailsHtml += `<li>${this.#escapeHtml(err.id)}: ${this.#escapeHtml(err.message)}</li>`;
                });
                if (errors.length > 10) {
                    detailsHtml += `<li>... and ${errors.length - 10} more</li>`;
                }
                detailsHtml += `</ul></div>`;
            }
            
            if (skipped.length > 0) {
                detailsHtml += `<div class="toast-section"><strong>Skipped:</strong><ul>`;
                skipped.slice(0, 10).forEach(skip => {
                    detailsHtml += `<li>${this.#escapeHtml(skip.id)}: ${this.#escapeHtml(skip.reason)}</li>`;
                });
                if (skipped.length > 10) {
                    detailsHtml += `<li>... and ${skipped.length - 10} more</li>`;
                }
                detailsHtml += `</ul></div>`;
            }
            
            detailsHtml += `</div></div>`;
        }
        
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <div class="toast-body">
                <span class="toast-message">${this.#escapeHtml(title)}</span>
                <span class="toast-summary">${summary}</span>
                ${detailsHtml}
            </div>
            <button class="toast-close" aria-label="Close">×</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.#remove(toast));
        
        // Toggle details
        const toggleBtn = toast.querySelector('.toast-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const content = toast.querySelector('.toast-details-content');
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                toggleBtn.textContent = isHidden ? 'Hide details ▲' : 'Show details ▼';
            });
        }

        this.#container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('toast-show'), 10);

        // Don't auto-remove if there are issues to review
        if (!hasIssues) {
            setTimeout(() => this.#remove(toast), 5000);
        }

        return toast;
    }
}
