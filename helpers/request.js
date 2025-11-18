export default class Request {

    static async post(url, body = {}, retry = true) {
        return await Request.fetch('POST', url, {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }, retry);
    }

    static async get(url, query = {}, retry = true) {
        const queryString = new URLSearchParams(query).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        return await Request.fetch('GET', fullUrl, {}, retry);
    }

    static async fetch(method, url, options = {}, retry = true, timeout = 10000) {
        try {
            const response = await fetch(url, {
                method,
                ...options,
                signal: AbortSignal.timeout(timeout),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error('Error fetching data:', error);
            if (!retry) throw error;
            await new Promise(r => setTimeout(() => r(), 1000));
            return Request.fetch(method, url, options);
        }
    }

}