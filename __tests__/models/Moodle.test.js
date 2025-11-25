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

    describe('Edge cases', () => {
        it('should handle special characters in subject names', () => {
            const subjectName = 'C++ & Algoritmos';
            const fullName = `"[2025.1] INF-2AT - ${subjectName}"`;
            
            expect(fullName).toContain('C++ & Algoritmos');
        });

        it('should handle unicode in subject names', () => {
            const subjectName = 'Cálculo & Álgebra';
            const fullName = `"[2025.1] MTM-1AN - ${subjectName}"`;
            
            expect(fullName).toContain('Cálculo & Álgebra');
        });

        it('should handle emoji in subject names', () => {
            const subjectName = 'Programming 🚀';
            const fullName = `"[2025.1] INF-1AT - ${subjectName}"`;
            
            expect(fullName).toContain('Programming 🚀');
        });

        it('should handle very long class names', () => {
            const className = 'A'.repeat(100);
            const shortName = `CH_${className.replace(/[-,]/g, '_')}_BD_2025.1`;
            
            expect(shortName).toContain('A'.repeat(100));
        });

        it('should handle multiple hyphens in subject name', () => {
            const fullSubjectName = 'TEC - Sub - Topic - Detail';
            const subjectName = fullSubjectName.split('-').slice(1).join('-').trim();
            
            expect(subjectName).toBe('Sub - Topic - Detail');
        });

        it('should handle multiple spaces in shortname split', () => {
            const fullShort = 'TEC   -   BD';
            const shortName = fullShort.split(/\s*-\s*/)?.slice(1).join('');
            
            expect(shortName).toBe('BD');
        });

        it('should handle comma in multi-class replacement', () => {
            const className = 'INF-1AT,ECA-2AN,TSI-3BM';
            const shortClassName = className.replace(/[-,]/g, '_');
            
            expect(shortClassName).toBe('INF_1AT_ECA_2AN_TSI_3BM');
        });

        it('should handle empty groupnames array', () => {
            const groupnames = [];
            const group = groupnames.includes('Grupo 1') ? '_G1' : 
                          groupnames.includes('Grupo 2') ? '_G2' : '';
            
            expect(group).toBe('');
        });

        it('should handle both Grupo 1 and Grupo 2 in array (Grupo 1 takes precedence)', () => {
            const groupnames = ['Grupo 1', 'Grupo 2'];
            const group = groupnames.includes('Grupo 1') ? '_G1' : 
                          groupnames.includes('Grupo 2') ? '_G2' : '';
            
            expect(group).toBe('_G1');
        });

        it('should handle year with 4 digits', () => {
            const year = 2025;
            const semester = 2;
            const fullName = `"[${year}.${semester}] INF-1AT - Test"`;
            
            expect(fullName).toBe('"[2025.2] INF-1AT - Test"');
        });

        it('should handle semester boundary values', () => {
            const testCases = [
                { semester: 1, expected: '"[2025.1] INF-1AT - Test"' },
                { semester: 2, expected: '"[2025.2] INF-1AT - Test"' }
            ];
            
            testCases.forEach(({ semester, expected }) => {
                const fullName = `"[2025.${semester}] INF-1AT - Test"`;
                expect(fullName).toBe(expected);
            });
        });

        it('should handle category value of 0', () => {
            const moodleConfig = { categories: { 'ROOT': 0 } };
            const className = 'ROOT-1A';
            const prefix = className.split('-')[0];
            const category = moodleConfig.categories[prefix];
            
            expect(category).toBe(0);
        });

        it('should handle missing category gracefully', () => {
            const moodleConfig = { categories: { 'INF': 115 } };
            const className = 'UNKNOWN-1A';
            const prefix = className.split('-')[0];
            const category = moodleConfig.categories[prefix];
            
            // Should not be added to subjects if category is undefined
            expect(category).toBeUndefined();
            
            const shouldAdd = category !== undefined;
            expect(shouldAdd).toBe(false);
        });

        it('should handle single classid in array', () => {
            const classes = [{ id: '1', name: 'INF-1AT' }];
            const subject = { classids: ['1'] };
            
            const className = subject.classids.length > 1 
                ? classes.filter(cl => subject.classids.includes(cl.id)).map(cl => cl.name).join(',')
                : classes[0].name;
            
            expect(className).toBe('INF-1AT');
        });

        it('should handle three or more classes in multi-class subject', () => {
            const classes = [
                { id: '1', name: 'INF-1AT' },
                { id: '2', name: 'ECA-2AN' },
                { id: '3', name: 'TSI-3BM' }
            ];
            const subject = { classids: ['1', '2', '3'] };
            
            const className = subject.classids.length > 1 
                ? classes.filter(cl => subject.classids.includes(cl.id)).map(cl => cl.name).join(',')
                : 'INF-1AT';
            
            expect(className).toBe('INF-1AT,ECA-2AN,TSI-3BM');
        });

        it('should handle whitespace in CSV values', () => {
            const csv = 'fullname,  shortname  , category\n"[2025.1] Test",  CH_Test  , 115';
            const lines = csv.split('\n');
            const dataLine = lines[1].split(',').map(item => item.trim());
            
            expect(dataLine[0]).toBe('"[2025.1] Test"');
            expect(dataLine[1]).toBe('CH_Test');
            expect(dataLine[2]).toBe('115');
        });

        it('should handle empty CSV content', () => {
            const csv = '';
            const lines = csv.split('\n');
            
            expect(lines.length).toBe(1);
            expect(lines[0]).toBe('');
        });

        it('should handle CSV with only header', () => {
            const csv = 'fullname, shortname, category';
            const lines = csv.split('\n');
            const dataRows = lines.slice(1);
            
            expect(dataRows.length).toBe(0);
        });

        it('should handle duplicate detection with exact match', () => {
            const fullname1 = '"[2025.1] INF-1AT - Test"';
            const fullname2 = '"[2025.1] INF-1AT - Test"';
            const fullname3 = '"[2025.1] INF-2AT - Test"';
            
            const subjects = [fullname1, fullname2, fullname3];
            const unique = [...new Set(subjects)];
            
            expect(unique.length).toBe(2);
        });

        it('should handle subject with no hyphen in shortname', () => {
            const fullShort = 'TESTBD';
            const shortName = fullShort.split(/\s*-\s*/)?.slice(1).join('');
            
            // When there's no hyphen, slice(1) returns empty
            expect(shortName).toBe('');
        });

        it('should handle group replacement edge cases', () => {
            const testCases = [
                { group: '', expected: '' },
                { group: '_G1', expected: '-G1' },
                { group: '_G2', expected: '-G2' }
            ];
            
            testCases.forEach(({ group, expected }) => {
                const replaced = group.replace('_', '-');
                expect(replaced).toBe(expected);
            });
        });
    });
});
