class Request {
    static #baseURL = '';
    static #defaultHeaders = {
        'Content-Type': 'application/json'
    };
    static #timeout = 30000; // 30 seconds default timeout

    /**
     * Configure global request settings
     */
    static configure({ baseURL, headers, timeout } = {}) {
        if (baseURL !== undefined) this.#baseURL = baseURL;
        if (headers !== undefined) this.#defaultHeaders = { ...this.#defaultHeaders, ...headers };
        if (timeout !== undefined) this.#timeout = timeout;
    }

    /**
     * Make a request with automatic error handling
     */
    static async #request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.#timeout);

        try {
            const fullURL = this.#baseURL + url;
            const config = {
                ...options,
                headers: {
                    ...this.#defaultHeaders,
                    ...options.headers
                },
                signal: controller.signal
            };

            const response = await fetch(fullURL, config);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Parse response based on content type
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return await response.json();
            }
            return await response.text();

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    /**
     * GET request
     */
    static async get(url, options = {}) {
        return this.#request(url, {
            ...options,
            method: 'GET'
        });
    }

    /**
     * POST request
     */
    static async post(url, data, options = {}) {
        return this.#request(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    static async put(url, data, options = {}) {
        return this.#request(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * PATCH request
     */
    static async patch(url, data, options = {}) {
        return this.#request(url, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    static async delete(url, options = {}) {
        return this.#request(url, {
            ...options,
            method: 'DELETE'
        });
    }
}

export { Request };
