import fs from 'fs';
import path from 'path';

const defaultSelectorFilePath = path.resolve('config', 'suap-selectors.json');

const defaultSuapSelectors = Object.freeze({
    login: {
        username: [
            '#id_username',
            '#username',
            'input[name="username"]',
            'input[name="login"]',
        ],
        password: [
            '#id_password',
            '#password',
            'input[name="password"]',
            'input[type="password"]',
        ],
        submit: [
            'input[type="submit"]',
            'button[type="submit"]',
        ],
        postLoginReady: [
            '#user-tools .user-profile',
            '#user-tools',
            '.user-profile',
            'a[href*="logout"]',
            'a[href*="/accounts/logout"]',
        ],
    },
    session: {
        invalidWhenPresent: [
            '#id_username',
            '#username',
            'input[name="username"]',
            'input[name="login"]',
        ],
        expiredMessages: [
            'Sua sessão expirou',
            'faça login novamente',
            'Efetuar login',
        ],
    },
});

let cachedFilePath = null;
let cachedMtimeMs = null;
let cachedSelectors = null;

/**
 * Build a mutable deep clone for a plain JSON-compatible object.
 * @param {object} value - Source object.
 * @returns {object} Cloned object.
 */
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Normalize a selector list and keep the fallback list when custom input is invalid.
 * @param {unknown} candidate - Candidate custom list.
 * @param {string[]} fallback - Default list.
 * @returns {string[]} Normalized non-empty selector list.
 */
function normalizeList(candidate, fallback) {
    if (!Array.isArray(candidate)) {
        return [...fallback];
    }

    const normalized = candidate
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);

    return normalized.length > 0 ? normalized : [...fallback];
}

/**
 * Merge user-provided selectors into the default schema.
 * @param {unknown} rawSelectors - Parsed selector object.
 * @returns {object} Merged selectors object.
 */
function mergeSelectors(rawSelectors) {
    const merged = clone(defaultSuapSelectors);

    if (!rawSelectors || typeof rawSelectors !== 'object') {
        return merged;
    }

    const login = rawSelectors.login || {};
    const session = rawSelectors.session || {};

    merged.login.username = normalizeList(login.username, merged.login.username);
    merged.login.password = normalizeList(login.password, merged.login.password);
    merged.login.submit = normalizeList(login.submit, merged.login.submit);
    merged.login.postLoginReady = normalizeList(login.postLoginReady, merged.login.postLoginReady);

    merged.session.invalidWhenPresent = normalizeList(
        session.invalidWhenPresent,
        merged.session.invalidWhenPresent,
    );
    merged.session.expiredMessages = normalizeList(
        session.expiredMessages,
        merged.session.expiredMessages,
    );

    return merged;
}

/**
 * Load SUAP selectors from a JSON file, with defaults and hot-reload via mtime cache.
 * @param {string} [filePath] - Optional custom selector file path.
 * @returns {object} Effective selector configuration.
 */
function loadSuapSelectors(filePath = process.env.SUAP_SELECTORS_FILE || defaultSelectorFilePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return clone(defaultSuapSelectors);
        }

        const stats = fs.statSync(filePath);
        if (cachedSelectors && cachedFilePath === filePath && cachedMtimeMs === stats.mtimeMs) {
            return clone(cachedSelectors);
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        const merged = mergeSelectors(parsed);

        cachedFilePath = filePath;
        cachedMtimeMs = stats.mtimeMs;
        cachedSelectors = merged;

        return clone(merged);
    } catch (error) {
        console.error(`Could not load SUAP selectors from ${filePath}: ${error.message}`);
        return clone(defaultSuapSelectors);
    }
}

export { defaultSelectorFilePath, defaultSuapSelectors, loadSuapSelectors };
