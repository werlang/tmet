/**
 * Timetables Helper Tests
 * Tests for the Timetables helper with fetch mocking
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole } from '../setup.js';

// Mock Request helper
const mockRequest = {
    post: jest.fn()
};

jest.unstable_mockModule('../../helpers/request.js', () => ({
    Request: mockRequest
}));

// Import after mocking
const { TimeTables } = await import('../../helpers/timetables.js');

describe('TimeTables Helper', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create instance with provided params', () => {
            const tt = new TimeTables({
                year: 2025,
                dateFrom: '2025-01-01',
                dateTo: '2025-06-30'
            });

            expect(tt.year).toBe(2025);
            expect(tt.dateFrom).toBe('2025-01-01');
            expect(tt.dateTo).toBe('2025-06-30');
        });

        it('should use default dates when not provided', () => {
            const tt = new TimeTables({ year: 2025 });

            expect(tt.year).toBe(2025);
            expect(tt.dateFrom).toBeDefined();
            expect(tt.dateTo).toBeDefined();
        });
    });

    describe('fetchDatabase()', () => {
        it('should fetch database from EduPage API', async () => {
            const mockResponse = {
                r: {
                    tables: [
                        { id: 'teachers', data_rows: [{ id: '1', name: 'Teacher 1' }] },
                        { id: 'classes', data_rows: [{ id: '1', name: 'INF-1AT' }] },
                        { id: 'classrooms', data_rows: [] },
                        { id: 'subjects', data_rows: [{ id: '1', name: 'Math' }] }
                    ]
                }
            };

            mockRequest.post.mockResolvedValue(mockResponse);

            const tt = new TimeTables({ year: 2025 });
            const result = await tt.fetchDatabase();

            expect(mockRequest.post).toHaveBeenCalled();
            expect(result).toEqual(mockResponse);
        });

        it('should cache database response', async () => {
            const mockResponse = { r: { tables: [] } };
            mockRequest.post.mockResolvedValue(mockResponse);

            const tt = new TimeTables({ year: 2025 });
            await tt.fetchDatabase();
            await tt.fetchDatabase();

            expect(mockRequest.post).toHaveBeenCalledTimes(1);
        });
    });

    describe('fetchClass()', () => {
        it('should fetch class data from EduPage API', async () => {
            const mockResponse = {
                r: {
                    ttitems: [
                        { subjectid: '1', classids: ['1'] }
                    ]
                }
            };

            mockRequest.post.mockResolvedValue(mockResponse);

            const tt = new TimeTables({ year: 2025 });
            const result = await tt.fetchClass('1');

            expect(mockRequest.post).toHaveBeenCalled();
            expect(result).toEqual(mockResponse);
        });
    });

    describe('getClasses()', () => {
        it('should get classes with their subjects', async () => {
            const dbResponse = {
                r: {
                    tables: [
                        { id: 'teachers', data_rows: [] },
                        { id: 'classes', data_rows: [{ id: '1', name: 'INF-1AT' }] },
                        { id: 'classrooms', data_rows: [] },
                        { id: 'subjects', data_rows: [{ id: 's1', name: 'Math', short: 'MAT' }] }
                    ]
                }
            };

            const classResponse = {
                r: {
                    ttitems: [
                        { subjectid: 's1', classids: ['1'], groupnames: [] }
                    ]
                }
            };

            mockRequest.post
                .mockResolvedValueOnce(dbResponse)
                .mockResolvedValueOnce(classResponse);

            const tt = new TimeTables({ year: 2025 });
            const classes = await tt.getClasses();

            expect(classes.length).toBe(1);
            expect(classes[0].name).toBe('INF-1AT');
        });

        it('should attach subject objects to class items', async () => {
            const dbResponse = {
                r: {
                    tables: [
                        { id: 'teachers', data_rows: [] },
                        { id: 'classes', data_rows: [{ id: '1', name: 'INF-1AT' }] },
                        { id: 'classrooms', data_rows: [] },
                        { id: 'subjects', data_rows: [{ id: 's1', name: 'Math', short: 'MAT' }] }
                    ]
                }
            };

            const classResponse = {
                r: {
                    ttitems: [
                        { subjectid: 's1', classids: ['1'] }
                    ]
                }
            };

            mockRequest.post
                .mockResolvedValueOnce(dbResponse)
                .mockResolvedValueOnce(classResponse);

            const tt = new TimeTables({ year: 2025 });
            const classes = await tt.getClasses();

            expect(classes[0].subjects[0].subject.name).toBe('Math');
        });

        it('should handle classes with no subjects', async () => {
            const dbResponse = {
                r: {
                    tables: [
                        { id: 'teachers', data_rows: [] },
                        { id: 'classes', data_rows: [{ id: '1', name: 'INF-1AT' }] },
                        { id: 'classrooms', data_rows: [] },
                        { id: 'subjects', data_rows: [] }
                    ]
                }
            };

            const classResponse = {
                r: { ttitems: [] }
            };

            mockRequest.post
                .mockResolvedValueOnce(dbResponse)
                .mockResolvedValueOnce(classResponse);

            const tt = new TimeTables({ year: 2025 });
            const classes = await tt.getClasses();

            expect(classes[0].subjects).toBeUndefined();
        });
    });

    describe('getSubject()', () => {
        it('should return subject by id', async () => {
            const dbResponse = {
                r: {
                    tables: [
                        { id: 'teachers', data_rows: [] },
                        { id: 'classes', data_rows: [] },
                        { id: 'classrooms', data_rows: [] },
                        { id: 'subjects', data_rows: [{ id: 's1', name: 'Math' }] }
                    ]
                }
            };

            mockRequest.post.mockResolvedValue(dbResponse);

            const tt = new TimeTables({ year: 2025 });
            await tt.getEntities();
            
            const subject = tt.getSubject('s1');
            expect(subject.name).toBe('Math');
        });

        it('should return null for unknown subject', async () => {
            const tt = new TimeTables({ year: 2025 });
            const subject = tt.getSubject('unknown');
            expect(subject).toBeNull();
        });
    });

    describe('getEntities()', () => {
        it('should return all entities from database', async () => {
            const dbResponse = {
                r: {
                    tables: [
                        { id: 'teachers', data_rows: [{ id: '1' }] },
                        { id: 'classes', data_rows: [{ id: '1' }] },
                        { id: 'classrooms', data_rows: [{ id: '1' }] },
                        { id: 'subjects', data_rows: [{ id: '1' }] }
                    ]
                }
            };

            mockRequest.post.mockResolvedValue(dbResponse);

            const tt = new TimeTables({ year: 2025 });
            const entities = await tt.getEntities();

            expect(entities.teachers.length).toBe(1);
            expect(entities.classes.length).toBe(1);
            expect(entities.classrooms.length).toBe(1);
            expect(entities.subjects.length).toBe(1);
        });

        it('should handle missing tables gracefully', async () => {
            const dbResponse = {
                r: { tables: [] }
            };

            mockRequest.post.mockResolvedValue(dbResponse);

            const tt = new TimeTables({ year: 2025 });
            const entities = await tt.getEntities();

            expect(entities.teachers).toEqual([]);
            expect(entities.classes).toEqual([]);
        });
    });
});
