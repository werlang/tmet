import { Request } from "./request.js";

class TimeTables {

    constructor({ year, dateFrom, dateTo }) {
        this.year = year;
        this.dateTo = dateTo || new Date().toISOString().split('T')[0];
        this.dateFrom = dateFrom || new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0];
        this.database = null;
        this.entities = null;
    }

    async fetchDatabase() {
        if (this.database) {
            return this.database;
        }

        const url = `https://ifsulcharq.edupage.org/rpr/server/maindbi.js?__func=mainDBIAccessor`;
        const bodyObj = {
            "__args": [
                null,
                this.year,
                {
                    "vt_filter": {
                        "datefrom": this.dateFrom,
                        "dateto": this.dateTo
                    }
                },
                {
                    "op": "fetch",
                    "needed_part": {
                        "teachers": [
                            "short"
                        ],
                        "classes": [
                            "short",
                            "name"
                        ],
                        "classrooms": [
                            "short"
                        ],
                        "subjects": [
                            "short",
                            "name"
                        ]
                    },
                    "needed_combos": {}
                }
            ],
            "__gsh": "00000000"
        };
        const response = await Request.post(url, bodyObj);
        this.database = response;
        return response;
    }

    async fetchClass(classId) {
        const url = `https://ifsulcharq.edupage.org/timetable/server/currenttt.js?__func=curentttGetData`;
        const bodyObj = {
            "__args": [
                null,
                {
                    "year": this.year,
                    "datefrom": this.dateFrom,
                    "dateto": this.dateTo,
                    "table": "classes",
                    "id": classId,
                    "showColors": true,
                    "showIgroupsInClasses": false,
                    "showOrig": true,
                    "log_module": "CurrentTTView"
                }
            ],
            "__gsh": "00000000"
        };
        const response = await Request.post(url, bodyObj);
        return response;
    }

    async getClasses() {
        const { classes } = await this.getEntities();
        // console.log(classes);
        const ids = classes.map(c => c.id);
        const classesFetchedData = await Promise.all(ids.map(id => this.fetchClass(id)));
        // console.log(classesFetchedData);

        classes.forEach(classObj => {
            let classData = classesFetchedData.filter(c => c?.r?.ttitems.length).find(c => c?.r?.ttitems?.every(item => item.classids.includes(classObj.id)))?.r.ttitems;

            classData?.forEach(item => {
                item.subject = this.getSubject(item.subjectid);
            });
            classObj.subjects = classData;
        });

        return classes;
    }

    getSubject(subjectId) {
        const { subjects } = this.entities || {};
        return subjects?.find(s => s.id === subjectId) || null;
    }

    async getEntities() {
        const db = await this.fetchDatabase();
        const teachers = db?.r.tables.find(t => t.id === 'teachers')?.data_rows || [];
        const classes = db?.r.tables.find(t => t.id === 'classes')?.data_rows || [];
        const classrooms = db?.r.tables.find(t => t.id === 'classrooms')?.data_rows || [];
        const subjects = db?.r.tables.find(t => t.id === 'subjects')?.data_rows || [];

        console.log(`Fetched ${teachers.length} teachers, ${classes.length} classes, ${classrooms.length} classrooms, ${subjects.length} subjects.`);
        this.entities = { teachers, classes, classrooms, subjects };

        return { ...this.entities };
    }
}

export { TimeTables };