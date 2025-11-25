import { escapeHtml } from '../helpers/text.js';
import Matching from '../models/matching.js';
import Toast from './toast.js';
import ProgressModal from './progress-modal.js';

/**
 * AI Match Modal Component
 * Manages the AI match suggestion modal lifecycle
 * Handles display, polling, and approval of AI-generated matches
 */
export class AIMatchModal {
    #elements = {};
    #pendingMatches = [];
    #onComplete = null;
    #suapSubjects = [];
    #progressModal = null;

    constructor(elements) {
        this.#elements = elements;
        this.#progressModal = new ProgressModal();
        this.#attachEventListeners();
    }

    /**
     * Attach modal event listeners
     */
    #attachEventListeners() {
        this.#elements.modalCloseBtn.addEventListener('click', () => this.close());
        this.#elements.modalCancelBtn.addEventListener('click', () => this.close());
        this.#elements.modalApproveBtn.addEventListener('click', () => this.#applyMatches());
    }

    /**
     * Start AI matching process with polling
     * @param {Array} moodleSubjects - Unmatched Moodle subjects
     * @param {Array} suapSubjects - Unmatched SUAP subjects
     * @param {Function} onComplete - Callback when matching is complete
     */
    async startAIMatching(moodleSubjects, suapSubjects, onComplete) {
        if (moodleSubjects.length === 0) {
            Toast.error('No unmatched Moodle subjects available for AI matching');
            return;
        }

        if (suapSubjects.length === 0) {
            Toast.error('No unmatched SUAP subjects available for AI matching');
            return;
        }

        // Store SUAP subjects for lookup during display
        this.#suapSubjects = suapSubjects;

        // Show progress modal
        this.#progressModal.show({
            title: 'AI Matching in Progress',
            message: 'Sending subjects to AI model',
            warning: 'This process may take several minutes. Please be patient while the AI analyzes the subjects and generates match suggestions.'
        });

        try {
            const result = await Matching.startAIMatching(moodleSubjects, suapSubjects);
            this.#progressModal.updateStatus('AI processing matches');
            await this.#pollJobStatus(result.jobId, onComplete);
        } catch (error) {
            this.#progressModal.hide();
            // Error already handled in Matching
        }
    }

    /**
     * Poll AI matching job status
     * @param {string} jobId - Job ID to poll
     * @param {Function} onComplete - Callback when complete
     */
    async #pollJobStatus(jobId, onComplete) {
        const pollInterval = 1000; // 1 second
        const maxAttempts = 600; // 10 minutes
        let attempts = 0;

        const poll = async () => {
            try {
                attempts++;
                
                // Update progress status periodically
                if (attempts % 5 === 0) {
                    this.#progressModal.updateStatus(`Analyzing subjects (attempt ${attempts})`);
                }

                const status = await Matching.getAIMatchingStatus(jobId);

                if (status.status === 'completed') {
                    this.#progressModal.hide();
                    
                    if (!status?.results?.matches || status.results.matches.length === 0) {
                        Toast.info('AI could not find confident matches for the remaining subjects');
                        onComplete();
                        return;
                    }

                    this.show(status.results.matches, onComplete);
                    return;
                }

                if (status.status === 'failed') {
                    this.#progressModal.hide();
                    throw new Error(status.error || 'AI matching job failed');
                }

                // Still processing
                if (attempts >= maxAttempts) {
                    this.#progressModal.hide();
                    throw new Error('AI matching timed out');
                }

                setTimeout(poll, pollInterval);

            } catch (error) {
                this.#progressModal.hide();
                onComplete();
                throw error;
            }
        };

        poll();
    }

    /**
     * Show modal with AI suggestions
     * @param {Array} matches - AI-generated matches
     * @param {Function} onComplete - Callback after matches applied
     */
    show(matches, onComplete) {
        this.#pendingMatches = matches;
        this.#onComplete = onComplete;
        
        this.#elements.aiSuggestionsList.innerHTML = '';
        
        matches.forEach((match, index) => {
            const item = this.#createSuggestionItem(match, index);
            this.#elements.aiSuggestionsList.appendChild(item);
        });
        
        this.#elements.aiMatchModal.classList.add('show');
    }

    /**
     * Create AI suggestion item
     * @param {Object} match - Match data
     * @param {number} index - Item index
     * @returns {HTMLElement}
     */
    #createSuggestionItem(match, index) {
        const div = document.createElement('div');
        div.className = 'ai-suggestion-item';
        
        // Store match data using closure
        div._matchData = match;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.id = `ai-match-${index}`;
        checkbox.className = 'ai-match-checkbox';
        
        const label = document.createElement('label');
        label.htmlFor = `ai-match-${index}`;
        label.className = 'ai-match-label';
        
        const moodleName = match.moodleFullname.replace(/"/g, '');
        
        // Look up SUAP subject details
        const suapDetails = match.suapIds.map(id => {
            const subject = this.#suapSubjects.find(s => s.id === id);
            if (subject) {
                return `<div class="suap-match-item">
                    <span class="suap-id">ID: ${escapeHtml(id)}</span>
                    <span class="suap-class">${escapeHtml(subject.className)}</span>
                    <span class="suap-name">${escapeHtml(subject.subjectName)}</span>
                </div>`;
            }
            return `<div class="suap-match-item"><span class="suap-id">ID: ${escapeHtml(id)}</span></div>`;
        }).join('');
        
        label.innerHTML = `
            <div class="match-pair">
                <div class="match-source">
                    <strong>Moodle:</strong> ${escapeHtml(moodleName)}
                </div>
                <div class="match-arrow">→</div>
                <div class="match-target">
                    <strong>SUAP:</strong>
                    <div class="suap-matches">${suapDetails}</div>
                </div>
            </div>
            ${match.reason ? `<div class="match-reason"><em>Reason:</em> ${escapeHtml(match.reason)}</div>` : ''}
        `;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        
        return div;
    }

    /**
     * Close modal
     */
    close() {
        this.#elements.aiMatchModal.classList.remove('show');
        this.#pendingMatches = [];
    }

    /**
     * Apply selected matches
     */
    async #applyMatches() {
        const checkboxes = this.#elements.aiSuggestionsList.querySelectorAll('.ai-match-checkbox:checked');
        const matches = [];
        
        checkboxes.forEach((checkbox) => {
            const suggestionItem = checkbox.closest('.ai-suggestion-item');
            const matchData = suggestionItem._matchData;
            if (matchData) {
                matches.push(matchData);
            }
        });
        
        if (matches.length === 0) {
            Toast.info('No matches selected');
            this.close();
            return;
        }

        this.#elements.modalApproveBtn.disabled = true;
        this.#elements.modalApproveBtn.textContent = 'Applying...';
        
        try {
            for (const match of matches) {
                await Matching.saveMatch(match.moodleFullname, match.suapIds);
            }
            
            Toast.success(`Successfully applied ${matches.length} AI-suggested match(es)`);
            this.close();
            
            if (this.#onComplete) {
                this.#onComplete();
            }
        } catch (error) {
            // Error already handled in Matching
        } finally {
            this.#elements.modalApproveBtn.disabled = false;
            this.#elements.modalApproveBtn.textContent = 'Apply Selected Matches';
        }
    }
}
