import config from '../config/chat-assist.js';

export default class ChatAssist {
    #url = config.url;
    #apiKey;
    #model;
    #conversationHistory = [];

    constructor(model = config.model) {
        this.#apiKey = process.env.CHAT_ASSIST_API_KEY;
        if (!this.#apiKey) {
            throw new Error('API_KEY environment variable is required');
        }
        this.#model = model;
    }

    /**
     * Send a chat completion request to API
     * @param {string} userMessage - The user's message
     * @param {string} systemPrompt - Optional system prompt to guide the AI
     * @param {Object} options - Additional options
     * @param {number} options.temperature - Sampling temperature (0-2)
     * @param {number} options.maxTokens - Maximum tokens in response
     * @param {boolean} options.keepHistory - Whether to maintain conversation history
     * @returns {Promise<string>} - The AI's response text
     */
    async chat(userMessage, systemPrompt = 'You are a helpful assistant.', options = {}) {
        const {
            temperature = config.temperature,
            maxTokens = config.maxTokens,
            keepHistory = false,
        } = options;

        try {
            const messages = this.#buildMessages(userMessage, systemPrompt, keepHistory);
            
            const body = {
                model: this.#model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: false,
            };

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.#apiKey}`,
            };

            const response = await fetch(this.#url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(300000), // 300s timeout for AI responses
            });
            // console.log(JSON.stringify(body, null, 2));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `API error (${response.status}): ${errorData.error?.message || response.statusText}`
                );
            }

            const data = await response.json();
            const assistantMessage = data.choices?.[0]?.message?.content;

            if (!assistantMessage) {
                throw new Error('No response content from API');
            }

            // Update conversation history if keeping history
            if (keepHistory) {
                this.#conversationHistory.push(
                    { role: 'user', content: userMessage },
                    { role: 'assistant', content: assistantMessage }
                );
            }

            return assistantMessage;

        } catch (error) {
            console.error('API error:', error.message);
            throw error;
        }
    }

    /**
     * Send a one-shot completion request without conversation history
     * @param {string} prompt - The complete prompt
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - The AI's response text
     */
    async complete(prompt, options = {}) {
        return this.chat(prompt, 'You are a helpful assistant.', {
            ...options,
            keepHistory: false,
        });
    }

    /**
     * Build messages array for API request
     * @private
     */
    #buildMessages(userMessage, systemPrompt, keepHistory) {
        const messages = [];

        // Add system prompt
        messages.push({ role: 'system', content: systemPrompt });

        // Add conversation history if keeping history
        if (keepHistory && this.#conversationHistory.length > 0) {
            messages.push(...this.#conversationHistory);
        }

        // Add current user message
        messages.push({ role: 'user', content: userMessage });

        return messages;
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.#conversationHistory = [];
    }

    /**
     * Get current conversation history
     * @returns {Array} - Array of message objects
     */
    getHistory() {
        return [...this.#conversationHistory];
    }

    /**
     * Set conversation history (useful for restoring sessions)
     * @param {Array} history - Array of message objects
     */
    setHistory(history) {
        if (!Array.isArray(history)) {
            throw new Error('History must be an array');
        }
        this.#conversationHistory = history;
    }
}

