import puppeteer from 'puppeteer-core';
import { suapConfig } from '../config/suap-config.js';
import { loadSuapSelectors } from '../config/suap-selectors.js';

class SUAPScraper {
    
    static browser = null;
    static page = null;
    static connected = false;
    static logged = false;
    static username = process.env.SUAP_USERNAME;
    static password = process.env.SUAP_PASSWORD;
    static chromePort = process.env.CHROME_PORT || 3000;
    static maxNavigationAttempts = 3;

    // Private constructor to prevent instantiation
    constructor() {
        throw new Error('SUAPScraper is a static class. Use static methods instead.');
    }

    static async connect() {
        // Remote debug: edge://inspect/#devices
        try {
            SUAPScraper.browser = await puppeteer.connect({
                browserURL: `http://chrome:${SUAPScraper.chromePort}`,
                // slowMo: 250
            });
        } catch (error) {
            console.error('Could not connect to Chrome.');
            return await new Promise(resolve => {
                setTimeout(async () => {
                    await SUAPScraper.connect();
                    resolve();
                }, 3000);
            });
        }

        const page = await SUAPScraper.browser.newPage();
        await page.setViewport({ width: 1920, height: 2000 });

        console.log('Connected to Chrome.');

        SUAPScraper.page = page;
        SUAPScraper.connected = true;
        return SUAPScraper;
    }

    static async login() {
        const selectors = loadSuapSelectors();

        console.log(`Logging in as ${SUAPScraper.username}`);
        await SUAPScraper.page.goto(`${suapConfig.baseUrl}/${suapConfig.login.url}`);

        const usernameSelector = await SUAPScraper.#findFirstSelector(selectors.login.username);
        const passwordSelector = await SUAPScraper.#findFirstSelector(selectors.login.password);
        const submitSelector = await SUAPScraper.#findFirstSelector(selectors.login.submit);

        if (!usernameSelector || !passwordSelector || !submitSelector) {
            throw new Error('Could not find SUAP login form fields. Check selectors in config/suap-selectors.json');
        }

        await SUAPScraper.page.$eval(usernameSelector, (el, _username) => el.value = _username, SUAPScraper.username);
        await SUAPScraper.page.$eval(passwordSelector, (el, _password) => el.value = _password, SUAPScraper.password);
        await SUAPScraper.page.click(submitSelector);

        await SUAPScraper.page.waitForNavigation({ timeout: 5000, waitUntil: 'domcontentloaded' }).catch(() => null);

        const sessionValid = await SUAPScraper.isSessionValid();
        if (!sessionValid) {
            throw new Error('SUAP login failed or session expired immediately after login');
        }

        await SUAPScraper.#waitForAnySelector(selectors.login.postLoginReady, { timeout: 5000 }).catch(() => null);

        console.log('Login successful');

        SUAPScraper.logged = true;
        return SUAPScraper;
    }

    /**
     * Check if we're still logged in by looking for login form elements
     * @returns {Promise<boolean>} True if session is valid
     */
    static async isSessionValid() {
        try {
            const selectors = loadSuapSelectors();

            // Check if login form exists (means we're on login page or session expired)
            const hasLoginForm = await SUAPScraper.#findFirstSelector(selectors.session.invalidWhenPresent);
            if (hasLoginForm) {
                console.log('Session expired - login form detected');
                return false;
            }
            
            // Check if there's an error message about session
            const pageContent = await SUAPScraper.page.content();
            const hasExpiredMessage = selectors.session.expiredMessages.some(
                (message) => pageContent.includes(message),
            );
            if (hasExpiredMessage) {
                console.log('Session expired - expiration message detected');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking session validity:', error.message);
            return false;
        }
    }

    /**
     * Navigate to a SUAP page and confirm it loaded.
     * Retries are bounded to avoid infinite relogin loops when selectors drift.
     * @param {string} url - Target URL.
     * @param {string} confirmElement - Selector that confirms page readiness.
     * @param {number} attempt - Internal attempt counter.
     * @returns {Promise<typeof SUAPScraper>}
     */
    static async goto(url, confirmElement, attempt = 1) {
        if (attempt > SUAPScraper.maxNavigationAttempts) {
            throw new Error(`SUAP navigation failed after ${SUAPScraper.maxNavigationAttempts} attempts: ${url}`);
        }

        try {
            if (!SUAPScraper.logged) {
                await SUAPScraper.login();
            }
            await SUAPScraper.page.goto(url);
            
            // Check if session is still valid after navigation
            const sessionValid = await SUAPScraper.isSessionValid();
            if (!sessionValid) {
                console.log('Session invalid after navigation, re-authenticating...');
                SUAPScraper.logged = false;
                await SUAPScraper.login();
                await SUAPScraper.page.goto(url);
            }
        } catch (err) {
            console.error(err);
            SUAPScraper.connected = false;
            await SUAPScraper.connect();
            console.log('Reconnected to browser, trying to load page again...');
            return await SUAPScraper.goto(url, confirmElement, attempt + 1);
        }

        if (confirmElement) {
            try {
                await SUAPScraper.page.waitForSelector(confirmElement, { timeout: 5000 });
                return SUAPScraper;
            } catch (err) {
                if (err.name === 'TimeoutError') {
                    console.log(`Timeout waiting for selector ${confirmElement}, trying to login again...`);
                    SUAPScraper.logged = false;
                    return await SUAPScraper.goto(url, confirmElement, attempt + 1);
                } else {
                    throw new Error(`Error loading SUAP page ${url}: ${err.message}`);
                }
            }
        }

        return SUAPScraper;
    }

    /**
     * Return the first selector that exists in the current document.
     * @param {string[]} selectors - Candidate selectors.
     * @returns {Promise<string|null>}
     */
    static async #findFirstSelector(selectors) {
        for (const selector of selectors) {
            if (!selector) {
                continue;
            }

            const element = await SUAPScraper.page.$(selector);
            if (element) {
                return selector;
            }
        }

        return null;
    }

    /**
     * Wait for any selector in the provided list.
     * @param {string[]} selectors - Candidate selectors.
     * @param {object} options - Puppeteer wait options.
     * @returns {Promise<string>} Resolved selector.
     */
    static async #waitForAnySelector(selectors, options = {}) {
        let lastError = null;

        for (const selector of selectors) {
            if (!selector) {
                continue;
            }

            try {
                await SUAPScraper.page.waitForSelector(selector, options);
                return selector;
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('No selector matched');
    }

    static async evaluate(fn, data = {}) {
        // Serialize functions in data
        const serializeFunctions = (data) => {
            if (!data || typeof data !== 'object') return data;
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'function') {
                    data[key] = `fn:${value.toString()}`;
                } 
                else if (value && typeof value === 'object' && !Array.isArray(value)) {
                    data[key] = serializeFunctions(value);
                }
                else if (Array.isArray(value)) {
                    data[key] = value.map(item => serializeFunctions(item));
                }
                else {
                    data[key] = value;
                }
            }
            return data;
        };
        const serialized = serializeFunctions(data) || {};
        // serialize function argument
        serialized.fn = fn.toString();
        // console.log(serialized);

        return SUAPScraper.page.evaluate((data) => {
            // in the browser, deserialize functions in data
            const deserializeFunctions = (data) => {
                for (const [key, value] of Object.entries(data)) {
                    if (typeof value === 'string' && value.startsWith('fn:')) {
                        data[key] = eval(`(${value.slice(3)})`);
                    }
                    else if (typeof value === 'object' && !Array.isArray(value)) {
                        data[key] = deserializeFunctions(value);
                    }
                    else if (Array.isArray(value)) {
                        data[key] = value.map(item => deserializeFunctions(item));
                    }
                }
                return data;
            };

            // Deserialize function argument
            const fn = eval(`(${data.fn})`);
            delete data.fn;
            const deserialized = deserializeFunctions(data);

            // execute function with deserialized data
            // if inside the function some function is called from data object, it will now work properly
            return fn(deserialized);
        }, serialized);
    }

    static async initialize() {
        if (!SUAPScraper.connected) {
            await SUAPScraper.connect();
        }
        return SUAPScraper;
    }

    static async generatePDF(text) {
        await SUAPScraper.initialize();

        try {
            // Set the HTML content
            await SUAPScraper.page.setContent(text, {
                waitUntil: 'networkidle0'
            });
    
            // Generate PDF
            const pdfBuffer = await SUAPScraper.page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
    
            // Convert Buffer to Base64
            const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    
            console.log(`PDF generated successfully - Size: ${pdfBuffer.length} bytes`);
    
            return pdfBase64;
        }
        catch (error) {
            console.error(error);
            SUAPScraper.connected = false;
            await SUAPScraper.connect();
            console.log('Reconnected to browser, trying to generate PDF again...');
            return await SUAPScraper.generatePDF(text);
        }
    }
}

export { SUAPScraper };