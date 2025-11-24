/**
 * Date and time helpers
 */

/**
 * Get current default year and semester based on current date
 * @returns {{year: number, semester: number}}
 */
export function getDefaultYearSemester() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-indexed
    const currentSemester = currentMonth <= 6 ? 1 : 2;

    return { year: currentYear, semester: currentSemester };
}
