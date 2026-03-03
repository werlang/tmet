export class Request {

    constructor({ url, headers, timeout, format } = {}) {
        this.url = url || '';
        this.headers = new Headers(headers || {});
        this.timeout = timeout || 5000;
        this.body = null;
        this.format = format || 'json';
    }

    setHeader(key, value) {
        this.headers.set(key, value);
    }

    setHeaders(headers) {
        for (const [key, value] of Object.entries(headers)) {
            this.headers.set(key, value);
        }
    }

    async get(endpoint, data = {}) {
        const query = new URLSearchParams(data).toString();
        return this.fetch('GET', `${endpoint}?${query}`);
    }

    async post(endpoint, data = {}) {
        if (this.format === 'json') {
            this.setHeader('Content-Type', 'application/json');
            this.body = JSON.stringify(data);
        }
        else if (this.format === 'form') {
            this.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            this.body = new URLSearchParams(data).toString();
        }
        return this.fetch('POST', endpoint);
    }

    async fetch(method, endpoint, args = {}, {
        retry = true,
        timeout = 10000,
    } = {}) {
        try {
            const options = {
                method,
                headers: this.headers,
                ...args,
            };
            if (this.body) {
                options.body = this.body;
            }
            if (timeout) {
                options.signal = AbortSignal.timeout(timeout);
            }
            const response = await fetch(`${this.url}${endpoint}`, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error('Error fetching data:', error);
            if (!retry) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.fetch(method, endpoint, args, { retry, timeout });
        }
    }

}
