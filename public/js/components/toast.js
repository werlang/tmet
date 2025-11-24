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
}
