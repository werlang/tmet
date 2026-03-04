export class RequestWindow {
    constructor(windowSize = 10, {
        maxRetries = 3,
        timeoutMs = 20000,
        retryDelayMs = 1000,
    } = {}) {
        this.windowSize = windowSize;
        this.maxRetries = Math.max(0, maxRetries);
        this.timeout = timeoutMs;
        this.retryDelay = Math.max(0, retryDelayMs);
    }

    async #sleep(ms) {
        if (!ms) {
            return;
        }

        await new Promise(resolve => setTimeout(resolve, ms));
    }

    async #runWithTimeout(taskFactory, taskIndex) {
        if (!this.timeout || this.timeout <= 0) {
            return taskFactory();
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Request window task ${taskIndex} timed out after ${this.timeout}ms`));
            }, this.timeout);

            Promise.resolve()
                .then(() => taskFactory())
                .then((result) => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch((error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }

    async #executeTask(taskFactory, taskIndex) {
        let lastError = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
            try {
                return await this.#runWithTimeout(taskFactory, taskIndex);
            } catch (error) {
                lastError = error;

                if (attempt < this.maxRetries) {
                    await this.#sleep(this.retryDelay);
                }
            }
        }

        throw lastError;
    }

    async run(taskFactories) {
        if (!Array.isArray(taskFactories) || taskFactories.length === 0) {
            return;
        }

        let nextIndex = 0;
        const workerCount = Math.min(this.windowSize, taskFactories.length);

        const worker = async () => {
            while (nextIndex < taskFactories.length) {
                const taskIndex = nextIndex;
                nextIndex += 1;
                await this.#executeTask(taskFactories[taskIndex], taskIndex);
            }
        };

        await Promise.all(Array.from({ length: workerCount }, () => worker()));
    }
}