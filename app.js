import XMLReader from './reader.js';
import fs from 'fs';

const reader = await new XMLReader('asctt2012.xml').read();

// {
//     id: '593FEAE6F8CEE58D',
//     name: 'ECA-1AN',
//     short: 'ECA-1AN',
//     teacherid: '',
//     classroomids: '',
//     grade: '',
//     partner_id: ''
// }
// const classObj = reader.filter('classes', c => c.name === 'ECA-1AN');
// console.log(classObj);

// {
//     id: '60A2A3E6E9492CC8',
//     name: 'ECA1 - Cálculo I',
//     short: 'ECA1-Calc1',
//     partner_id: ''
// }
// const subjectObj = reader.filter('subjects', s => s.id === '60A2A3E6E9492CC8');
// console.log(subjectObj);

// {
//     id: '5BDAF57F60F6C4FE',
//     classids: 'F26BCE30ABDD7204',
//     subjectid: 'E6CD7EF84CB6E6B7',
//     periodspercard: '2',
//     periodsperweek: '2.0',
//     teacherids: '6906B631FE17284B',
//     classroomids: 'A123AED37B7E5A66,7CE9151E040B19F7',
//     groupids: 'F192A1AEB78A9FDA',
//     seminargroup: '',
//     termsdefid: 'C1E261FDB3063632',
//     weeksdefid: '8D758A3BD2BF2251',
//     daysdefid: '8E67DEAD97F015F4',
//     capacity: '*',
//     partner_id: ''
// },
// const lessonObj = reader.filter('lessons', l => l.subjectid === '60A2A3E6E9492CC8');
// console.log(lessonObj);

// {
//     id: '27D5614E62889572',
//     name: 'Grupo 1',
//     classid: 'AC5189F85C52A852',
//     studentids: '',
//     entireclass: '0',
//     divisiontag: '1'
// }
// const groupObj = reader.filter('groups', g => g.id === '27D5614E62889572');
// console.log(groupObj);


const semester = '2025.2';

const getFullName = (lesson) => {
    let className;
    let groupName;
    if (lesson.classids.split(',').length > 1) {
        className = lesson.classids.split(',').map(id => {
            const classObj = reader.filter('classes', c => c.id === id)?.[0];
            return classObj?.name;
        }).filter(Boolean).join(',');
        // console.log(classes);

        groupName = lesson.groupids.split(',').map(id => {
            const groupObj = reader.filter('groups', g => g.id === id)?.[0];
            return groupObj?.name;
        }).filter(Boolean).join(',');
    }
    else {
        className = reader.filter('classes', c => c.id === lesson.classids)?.[0]?.name;
        groupName = reader.filter('groups', g => g.id === lesson.groupids)?.[0]?.name;
    }

    const subject = reader.filter('subjects', s => s.id === lesson.subjectid)?.[0];


    // console.log(className, subject, groupName);
    if (!className || !subject || !groupName) return null;

    const groupAlias = {
        'Turma completa': '',
        'Grupo 1': '-G1',
        'Grupo 2': '-G2',
    }

    const subjectNameOnly = subject?.name.split('-')?.slice(1).join('-')?.trim();

    return `"[${semester}] ${className}${groupAlias[groupName] || ''} - ${subjectNameOnly}"`;
}

const getShortName = (lesson) => {
    let className;
    let groupName;
    if (lesson.classids.split(',').length > 1) {
        className = lesson.classids.split(',').map(id => {
            const classObj = reader.filter('classes', c => c.id === id)?.[0];
            return classObj?.name;
        }).filter(Boolean).join('_').replace(/-/g, '_');

        groupName = lesson.groupids.split(',').map(id => {
            const groupObj = reader.filter('groups', g => g.id === id)?.[0];
            return groupObj?.name;
        }).filter(Boolean).join('_').replace(/-/g, '_');
    }
    else {
        className = reader.filter('classes', c => c.id === lesson.classids)?.[0]?.name?.replace('-', '_');
        groupName = reader.filter('groups', g => g.id === lesson.groupids)?.[0]?.name?.replace('-', '_');
    }

    const subjectObj = reader.filter('subjects', s => s.id === lesson.subjectid)?.[0];
    if (!className || !subjectObj || !groupName) return null;

    const groupAlias = {
        'Turma completa': '',
        'Grupo 1': '_G1',
        'Grupo 2': '_G2',
    }
    const subjectShortName = subjectObj?.short.split(/\s*-\s*/)?.slice(1).join('');


    return `CH_${className}_${subjectShortName}_${semester}${groupAlias[groupName] || ''}`;
}

const getCategory = (lesson) => {
    const categories = {
        ECA: 119,
        FMC: 117,
        INF: 115,
        MCT: 116,
        MEST: 692,
        PED: 3249,
        TSI: 120
    }
    let classId = lesson.classids.split(',').shift();
    const classObj = reader.filter('classes', c => c.id === classId)?.[0];
    const className = classObj?.name.split('-')[0];
    if (!className) return null;

    return categories[className] || null;
}


let moodle = reader.getEntity('lessons')
    .map(l => {
        const fullName = getFullName(l);
        const shortName = getShortName(l);
        const category = getCategory(l);
        if (!fullName || !shortName || !category) return null;
        return `${fullName}, ${shortName}, ${category}`;
    })
    .filter(Boolean).sort();

const header = `fullname, shortname, category`
fs.writeFileSync('moodle.csv', [header, ...moodle].join('\n'));
