import fs from 'fs';

export default function match() {

    const SUAPsubjects = JSON.parse(fs.readFileSync('files/suap_subjects.json', 'utf-8'));
    
    const moodleSubjects = fs.readFileSync('files/moodle_classes.csv', 'utf-8').split('\n').slice(1).map(line => line.split(',').map(item => item.trim())).map(item => ({
        fullname: item[0],
        shortname: item[1],
        category: item[2],
    }));
    
    let noMatch = [];
    
    // Try to match Moodle subjects with SUAP subjects
    moodleSubjects.forEach(msubject => {
        // $1 = className (e.g., INF-1AT)
        // $2 = group (e.g., -G1) optional
        // $3 = secondary className (e.g., , INF-1BT) optional
        // $4 = subjectName (e.g., Banco de Dados)
        const regex = new RegExp(/"\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)"/);
        const moodleName = msubject.fullname.match(regex);
        if (!moodleName) return false;
        msubject.className = moodleName[1];
        msubject.secondaryClassName = moodleName[3] ? moodleName[3].replace(',', '').trim() : null;
        msubject.subjectName = moodleName[4].replace(/\s+/g, ' ').trim();
        msubject.group = moodleName[2] ? moodleName[2].replace('-', '') : false;
    
        const match = SUAPsubjects.find(ssubject => 
            ssubject.className === msubject.className &&
            ssubject.subjectName === msubject.subjectName &&
            ssubject.group === msubject.group
        );

        if (match) {
            msubject.suapId = match.id;
        }
        else {
            noMatch.push(msubject);
        }
    });
    
    const matching = moodleSubjects.length - noMatch.length;
    
    console.log(noMatch);
    console.log(`Found ${matching} / ${moodleSubjects.length} matching subjects.`);

    return {
        subjects: moodleSubjects,
        noMatch,
    }
    
}