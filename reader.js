import fs from 'fs';
import xml2js from 'xml2js';

export default class XMLReader {

    constructor(file) {
        // open xml from timetables
        this.xml = fs.readFileSync(file, 'utf8');
    }

    getXML() {
        return this.xml;
    }

    async getJSON() {
        return new Promise((resolve, reject) => xml2js.parseString(this.xml, (err, result) => {
            if (err) {
                console.error('Error parsing XML:', err);
                reject(err);
                return;
            }
            //   console.log('Parsed XML:', result);
            this.json = result;
            resolve(result);
        }));
    }

    async read() {
        await this.getJSON();
        return this;
    }

    getClasses() {
        return this.json.timetable.classes[0].class.map(c => c.$);
    }

    getSubjects() {
        return this.json.timetable.subjects[0].subject.map(s => s.$);
    }

    getLessons() {
        return this.json.timetable.lessons[0].lesson.map(l => l.$);
    }

    getGroups() {
        return this.json.timetable.groups[0].group.map(g => g.$);
    }

    getEntity(entity) {
        const entityList = {
            classes: this.getClasses.bind(this),
            subjects: this.getSubjects.bind(this),
            lessons: this.getLessons.bind(this),
            groups: this.getGroups.bind(this),
        }

        return entityList[entity] ? entityList[entity]() : [];
    }

    filter(entity, predicate = () => true) {
        return this.getEntity(entity).filter(predicate);
    }
}