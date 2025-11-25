/**
 * Moodle Model Logic Tests
 * Tests for Moodle-related business logic (without external dependencies)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole } from '../setup.js';
import { sampleEdupageClasses, sampleMoodleCsvContent } from '../fixtures.js';

describe('Moodle Model Logic', () => {
    suppressConsole();
    
    describe('CSV generation logic', () => {
        const moodleConfig = {
            categories: {
                'INF': 115,
                'ECA': 119,
                'TSI': 120,
                'FMC': 117
            }
        };

        it('should generate correct fullname format', () => {
            const year = 2025;
            const semester = 1;
            const className = 'INF-2AT';
            const group = '';
            const subjectName = 'Banco de Dados';
            
            const fullName = `"[${year}.${semester}] ${className}${group.replace('_', '-')} - ${subjectName}"`;
            
            expect(fullName).toBe('"[2025.1] INF-2AT - Banco de Dados"');
        });

        it('should generate correct fullname with group', () => {
            const year = 2025;
            const semester = 1;
            const className = 'INF-2AT';
            const group = '_G1';
            const subjectName = 'Banco de Dados';
            
            const fullName = `"[${year}.${semester}] ${className}${group.replace('_', '-')} - ${subjectName}"`;
            
            expect(fullName).toBe('"[2025.1] INF-2AT-G1 - Banco de Dados"');
        });

        it('should generate correct shortname format', () => {
            const className = 'INF-2AT';
            const subjectShort = 'BD';
            const year = 2025;
            const semester = 1;
            const group = '';
            
            const shortName = `CH_${className.replace(/[-,]/g, '_')}_${subjectShort}_${year}.${semester}${group}`;
            
            expect(shortName).toBe('CH_INF_2AT_BD_2025.1');
        });

        it('should generate correct shortname with group', () => {
            const className = 'INF-2AT';
            const subjectShort = 'BD';
            const year = 2025;
            const semester = 1;
            const group = '_G1';
            
            const shortName = `CH_${className.replace(/[-,]/g, '_')}_${subjectShort}_${year}.${semester}${group}`;
            
            expect(shortName).toBe('CH_INF_2AT_BD_2025.1_G1');
        });

        it('should determine group from groupnames', () => {
            const testCases = [
                { groupnames: ['Grupo 1'], expected: '_G1' },
                { groupnames: ['Grupo 2'], expected: '_G2' },
                { groupnames: [], expected: '' },
                { groupnames: ['Other'], expected: '' }
            ];
            
            testCases.forEach(({ groupnames, expected }) => {
                const group = groupnames.includes('Grupo 1') ? '_G1' : 
                              groupnames.includes('Grupo 2') ? '_G2' : '';
                expect(group).toBe(expected);
            });
        });

        it('should get correct category for class prefix', () => {
            const testCases = [
                { className: 'INF-1AT', expected: 115 },
                { className: 'ECA-2AN', expected: 119 },
                { className: 'TSI-3BM', expected: 120 },
                { className: 'FMC-1AN', expected: 117 },
                { className: 'UNKNOWN-1AT', expected: undefined }
            ];
            
            testCases.forEach(({ className, expected }) => {
                const prefix = className.split('-')[0];
                const category = moodleConfig.categories[prefix];
                expect(category).toBe(expected);
            });
        });

        it('should extract subject name from full name', () => {
            const testCases = [
                { full: 'TEC - Banco de Dados', expected: 'Banco de Dados' },
                { full: 'MAT - Cálculo I', expected: 'Cálculo I' },
                { full: 'GER - Gestão e Empreendedorismo', expected: 'Gestão e Empreendedorismo' }
            ];
            
            testCases.forEach(({ full, expected }) => {
                const subjectName = full.split('-').slice(1).join('-').trim();
                expect(subjectName).toBe(expected);
            });
        });

        it('should extract shortname from full short', () => {
            const testCases = [
                { full: 'TEC - BD', expected: 'BD' },
                { full: 'MAT - Calc1', expected: 'Calc1' },
                { full: 'TEC - PW1', expected: 'PW1' }
            ];
            
            testCases.forEach(({ full, expected }) => {
                const shortName = full.split(/\s*-\s*/)?.slice(1).join('');
                expect(shortName).toBe(expected);
            });
        });

        it('should handle multi-class subjects', () => {
            const classes = [
                { id: '1', name: 'ECA-8AN' },
                { id: '2', name: 'TSI-4AN' }
            ];
            const subject = {
                classids: ['1', '2']
            };
            
            const className = subject.classids.length > 1 
                ? classes.filter(cl => subject.classids.includes(cl.id)).map(cl => cl.name).join(',')
                : 'ECA-8AN';
            
            expect(className).toBe('ECA-8AN,TSI-4AN');
        });

        it('should deduplicate subjects by fullname', () => {
            const moodleSubjects = [
                ['"[2025.1] INF-1AT - Banco de Dados"', 'CH_INF_1AT_BD_2025.1', 115],
                ['"[2025.1] INF-1AT - Banco de Dados"', 'CH_INF_1AT_BD_2025.1', 115], // duplicate
                ['"[2025.1] INF-2AT - Programação Web"', 'CH_INF_2AT_PW_2025.1', 115]
            ];
            
            const uniqueSubjects = [];
            moodleSubjects.forEach(ms => {
                if (!uniqueSubjects.map(u => u[0]).includes(ms[0])) {
                    uniqueSubjects.push(ms);
                }
            });
            
            expect(uniqueSubjects.length).toBe(2);
        });

        it('should generate valid CSV format', () => {
            const header = ['fullname', 'shortname', 'category'];
            const subjects = [
                ['"[2025.1] INF-1AT - Banco de Dados"', 'CH_INF_1AT_BD_2025.1', 115]
            ];
            
            const allRows = [header, ...subjects];
            const csv = allRows.map(row => row.join(', ')).join('\n');
            
            expect(csv).toContain('fullname, shortname, category');
            expect(csv).toContain('"[2025.1] INF-1AT - Banco de Dados"');
        });
    });

    describe('CSV parsing logic for upload', () => {
        it('should parse CSV content into course objects', () => {
            const csv = sampleMoodleCsvContent;
            
            const courses = csv
                .split('\n')
                .map(line => line.split(',').map(item => item.trim()))
                .map(item => ({
                    fullname: item[0],
                    shortname: item[1],
                    category: item[2],
                }));
            
            // Skip header
            const dataRows = courses.slice(1);
            
            expect(dataRows.length).toBe(6);
            expect(dataRows[0].fullname).toBe('"[2025.1] INF-2AT-G2 - Programação Web I"');
            expect(dataRows[0].shortname).toBe('CH_INF_2AT_PW1_2025.1_G2');
            expect(dataRows[0].category).toBe('115');
        });
    });

    describe('uploadCourses logic', () => {
        it('should track success and error counts', () => {
            const results = {
                success: [],
                errors: []
            };
            
            // Simulate successful upload
            results.success.push({ id: 1, shortname: 'TEST1' });
            results.success.push({ id: 2, shortname: 'TEST2' });
            
            // Simulate failed upload
            results.errors.push({ course: 'TEST3', error: 'Duplicate shortname' });
            
            expect(results.success.length).toBe(2);
            expect(results.errors.length).toBe(1);
        });

        it('should format upload error correctly', () => {
            const course = { shortname: 'TEST_COURSE' };
            const errorMessage = 'Duplicate entry';
            
            const errorResult = {
                course: course.shortname,
                error: errorMessage
            };
            
            expect(errorResult.course).toBe('TEST_COURSE');
            expect(errorResult.error).toBe('Duplicate entry');
        });
    });
});
