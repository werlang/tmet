import fs from 'fs';
import TimeTables from './helpers/timetables.js';
import moodleConfig from './config/moodle-config.js';

async function main() {
    const moodleSubjects = [];

    const year = 2025;
    const semester = 2;

    const tt = new TimeTables({
        year,
        // dateFrom: `2025-11-01`,
        // dateTo: `2025-11-10`,
    });
    const classes = await tt.getClasses();
    classes.forEach(c => {
        c.subjects?.forEach(s => {
            const subjectObj = s.subject;

            const group = s.groupnames.includes('Grupo 1') ? '_G1' : s.groupnames.includes('Grupo 2') ? '_G2' : '';
            const className = s.classids.length > 1 ? classes.filter(cl => s.classids.includes(cl.id)).map(cl => cl.name).join(',') : c.name;

            // "[2025.2] TSI-2AN - Desenvolvimento Back-end I", CH_TSI_2AN_DBE1_2025.2, 120
            // "[2025.2] TSI-4AN,ECA-8AN - Gestão e Empreendedorismo", CH_TSI_4AN_ECA_8AN_GE_2025.2, 120
            // "[2025.2] INF-2AT-G1 - Banco de Dados", CH_INF_2AT_BD_2025.2_G1, 115
            const fullName = `"[${year}.${semester}] ${className}${group.replace('_', '-')} - ${subjectObj.name.split('-').slice(1).join('-').trim()}"`;
            const shortName = `CH_${className.replace(/[-,]/g, '_')}_${subjectObj.short.split(/\s*-\s*/)?.slice(1).join('')}_${year}.${semester}${group}`;
            const category = moodleConfig.categories[c.name.split('-')[0]];

            if (!moodleSubjects.map(ms => ms[0]).includes(fullName) && category) {
                moodleSubjects.push([
                    fullName,
                    shortName,
                    category,
                ]);
            }
        });
    });
    console.log(JSON.stringify(moodleSubjects.map(ms => ms.join(', ')), null, 2));
    fs.writeFileSync('files/moodle_classes.csv', moodleSubjects.map(ms => ms.join(', ')).join('\n'));
}
main().catch(console.error);
// const header = `fullname, shortname, category`
// fs.writeFileSync('moodle.csv', [header, ...moodle].join('\n'));
