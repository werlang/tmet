/**
 * Text manipulation and sanitization helpers
 */


/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Remove accents from text for accent-insensitive search
 * @param {string} str - Text to normalize
 * @returns {string} Text without accents
 */
export function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
