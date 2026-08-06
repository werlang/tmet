/**
 * SUAP scraper tests
 * Validates login selector fallbacks and bounded navigation retries.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { suppressConsole } from '../setup.js';

const mockConnect = jest.fn();

jest.unstable_mockModule('playwright-core', () => ({
    chromium: {
        connectOverCDP: mockConnect,
    },
}));

const { SUAPScraper } = await import('../../helpers/scraper.js');

describe('SUAPScraper', () => {
    suppressConsole();

    let tempSelectorsFile = null;

    beforeEach(() => {
        jest.clearAllMocks();
        SUAPScraper.browser = null;
        SUAPScraper.page = null;
        SUAPScraper.connected = true;
        SUAPScraper.logged = false;
        SUAPScraper.maxNavigationAttempts = 3;
    });

    afterEach(() => {
        SUAPScraper.maxNavigationAttempts = 3;
        delete process.env.SUAP_SELECTORS_FILE;

        if (tempSelectorsFile && fs.existsSync(tempSelectorsFile)) {
            fs.unlinkSync(tempSelectorsFile);
        }

        tempSelectorsFile = null;
    });

    it('uses fallback login selectors when the primary selector is not found', async () => {
        const mockPage = {
            goto: jest.fn().mockResolvedValue(undefined),
            $: jest.fn(async (selector) => {
                if (selector === 'input[name="username"]') return {};
                if (selector === 'input[type="password"]') return {};
                if (selector === 'input[type="submit"]') return {};
                return null;
            }),
            $eval: jest.fn().mockResolvedValue(undefined),
            click: jest.fn().mockResolvedValue(undefined),
            waitForLoadState: jest.fn().mockResolvedValue(undefined),
            waitForSelector: jest.fn().mockResolvedValue(undefined),
            content: jest.fn().mockResolvedValue('<html><body>ok</body></html>'),
        };

        SUAPScraper.page = mockPage;
        jest.spyOn(SUAPScraper, 'isSessionValid').mockResolvedValue(true);

        await SUAPScraper.login();

        expect(mockPage.$eval).toHaveBeenCalledWith(
            'input[name="username"]',
            expect.any(Function),
            SUAPScraper.username,
        );
        expect(mockPage.$eval).toHaveBeenCalledWith(
            'input[type="password"]',
            expect.any(Function),
            SUAPScraper.password,
        );
        expect(SUAPScraper.logged).toBe(true);
    });

    it('loads login selectors from an external selector file', async () => {
        tempSelectorsFile = path.join(os.tmpdir(), `tmet-suap-selectors-${Date.now()}.json`);
        fs.writeFileSync(tempSelectorsFile, JSON.stringify({
            login: {
                username: ['#custom-username'],
                password: ['#custom-password'],
                submit: ['#custom-submit'],
            },
        }));

        process.env.SUAP_SELECTORS_FILE = tempSelectorsFile;

        const mockPage = {
            goto: jest.fn().mockResolvedValue(undefined),
            $: jest.fn(async (selector) => {
                if (selector === '#custom-username') return {};
                if (selector === '#custom-password') return {};
                if (selector === '#custom-submit') return {};
                return null;
            }),
            $eval: jest.fn().mockResolvedValue(undefined),
            click: jest.fn().mockResolvedValue(undefined),
            waitForLoadState: jest.fn().mockResolvedValue(undefined),
            waitForSelector: jest.fn().mockResolvedValue(undefined),
            content: jest.fn().mockResolvedValue('<html><body>ok</body></html>'),
        };

        SUAPScraper.page = mockPage;
        jest.spyOn(SUAPScraper, 'isSessionValid').mockResolvedValue(true);

        await SUAPScraper.login();

        expect(mockPage.$eval).toHaveBeenCalledWith(
            '#custom-username',
            expect.any(Function),
            SUAPScraper.username,
        );
        expect(mockPage.$eval).toHaveBeenCalledWith(
            '#custom-password',
            expect.any(Function),
            SUAPScraper.password,
        );
        expect(mockPage.click).toHaveBeenCalledWith('#custom-submit');
    });

    it('stops retrying navigation when confirm selector never appears', async () => {
        const timeoutError = new Error('timeout');
        timeoutError.name = 'TimeoutError';

        const mockPage = {
            goto: jest.fn().mockResolvedValue(undefined),
            waitForSelector: jest.fn().mockRejectedValue(timeoutError),
            content: jest.fn().mockResolvedValue('<html><body>ok</body></html>'),
            $: jest.fn().mockResolvedValue(null),
        };

        SUAPScraper.page = mockPage;
        SUAPScraper.logged = true;
        SUAPScraper.maxNavigationAttempts = 2;

        jest.spyOn(SUAPScraper, 'isSessionValid').mockResolvedValue(true);
        jest.spyOn(SUAPScraper, 'login').mockImplementation(async () => {
            SUAPScraper.logged = true;
            return SUAPScraper;
        });

        await expect(SUAPScraper.goto('https://example.com', '#missing')).rejects.toThrow(
            'SUAP navigation failed after 2 attempts',
        );
    });
});
