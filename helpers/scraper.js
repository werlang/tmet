import puppeteer from 'puppeteer-core';
import suapConfig from '../config/suap-config.js';

export default class SUAPScraper {
    
    static browser = null;
    static page = null;
    static connected = false;
    static logged = false;
    static username = process.env.SUAP_USERNAME;
    static password = process.env.SUAP_PASSWORD;
    static chromePort = process.env.CHROME_PORT || 3000;

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
        console.log(`Logging in as ${SUAPScraper.username}`);
        await SUAPScraper.page.goto(`${suapConfig.baseUrl}/${suapConfig.login.url}`);
        await SUAPScraper.page.$eval(suapConfig.login.username, (el, _username) => el.value = _username, SUAPScraper.username);
        await SUAPScraper.page.$eval(suapConfig.login.password, (el, _password) => el.value = _password, SUAPScraper.password);
        await SUAPScraper.page.click(suapConfig.login.submit);

        await SUAPScraper.page.waitForSelector(suapConfig.login.ready, { timeout: 5000 });
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
            // Check if login form exists (means we're on login page or session expired)
            const hasLoginForm = await SUAPScraper.page.$(suapConfig.login.username);
            if (hasLoginForm) {
                console.log('Session expired - login form detected');
                return false;
            }
            
            // Check if there's an error message about session
            const pageContent = await SUAPScraper.page.content();
            if (pageContent.includes('Sua sessão expirou') || 
                pageContent.includes('faça login novamente') ||
                pageContent.includes('Efetuar login')) {
                console.log('Session expired - expiration message detected');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking session validity:', error.message);
            return false;
        }
    }

    static async goto(url, confirmElement) {
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
            return await SUAPScraper.goto(url, confirmElement);
        }

        if (confirmElement) {
            try {
                await SUAPScraper.page.waitForSelector(confirmElement, { timeout: 5000 });
                return SUAPScraper;
            } catch (err) {
                if (err.name === 'TimeoutError') {
                    console.log(`Timeout waiting for selector ${confirmElement}, trying to login again...`);
                    SUAPScraper.logged = false;
                    return await SUAPScraper.goto(url, confirmElement);
                } else {
                    throw Error('Error loading professor search results');
                }
            }
        }
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