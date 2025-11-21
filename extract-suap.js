import fs from "fs";
import SUAPScraper from "./helpers/scraper.js";
import suapConfig from "./config/suap-config.js";

await SUAPScraper.initialize();

const courses = {
    INF: 358,
    MCT: 395,
    FMC: 356,
    TSI: 264,
    ECA: 269,
    PED: 815,
};

const yearList = {
    2025: 72,
}

const year = 2025;
const semester = 1;

const SUAPJson = [];

for (const courseName of Object.keys(courses)) {
    const query = new URLSearchParams({
        ...suapConfig.bookSearch.url.query,
        ano_letivo: yearList[year],
        periodo_letivo__exact: semester,
        turma__curso_campus: courses[courseName],
        tab: 'tab_any_data',
        all: 'true',
    }).toString();
    const url = `${suapConfig.baseUrl}/${suapConfig.bookSearch.url.base}/?${query}`;
    await SUAPScraper.goto(url, suapConfig.bookSearch.ready);
    
    console.log(`Extracting data for course ${courseName}...`);
    const SUAPsubjects = await SUAPScraper.evaluate((template) => {
        const rows = [];
        document.querySelectorAll(template.rows).forEach((tr) => {
            rows.push({ 
                id: template.data.id(tr),
                name: template.data.name(tr),
                class: template.data.class(tr),
            });
        });
        return rows;
    }, suapConfig.bookSearch);
    
    SUAPsubjects.forEach((subject) => {
        // Banco de Dados, remove extra spaces
        const subjectName = subject.name.split(' - ')?.[1]?.replace(/\s+/g, ' ').trim();
        // INF-1AT
        subject.className = `${courseName}-${subject.class.split('.')?.[1]}A${subject.class.at(-1)}`;
        // INF-1AT - Banco de Dados
        subject.fullname = `${subject.className} - ${subjectName}`;
        subject.subjectName = subjectName;
        subject.group = false;    
    });
    // search for duplicates: same fullname, different id: assign groups G1 and G2
    SUAPsubjects.forEach((subject) => {
        const duplicate = SUAPsubjects.find(s => s.fullname === subject.fullname && s !== subject);
        if (duplicate) {
            subject.group = parseInt(duplicate.id) > parseInt(subject.id) ? 'G1' : 'G2';
        }
    });

    SUAPJson.push(...SUAPsubjects);
}

fs.writeFileSync('files/suap_subjects.json', JSON.stringify(SUAPJson, null, 2));
