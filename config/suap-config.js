const suapConfig = {
    baseUrl: 'https://suap.ifsul.edu.br',
    login: {
        url: 'accounts/login/',
        username: '#id_username',
        password: '#id_password',
        submit: 'input[type="submit"]',
        ready: '#user-tools .user-profile'
    },
    bookSearch: {
        url: {
            base: 'admin/edu/diario',
            query: {
                turma__curso_campus__diretoria__setor__uo: 4, // campus CH
                tab: 'tab_any_data',
            },
        },
        ready: '#changelist-form .results table#result_list',
        rows: '#changelist-form .results table#result_list tbody tr',
        data: {
            id: (tr) => tr.querySelectorAll('td')?.[1]?.textContent.trim(),
            class: (tr) => tr.querySelectorAll('td')?.[2]?.textContent.trim(),
            name: (tr) => tr.querySelectorAll('td')?.[3]?.textContent.trim(),
        }
    },
    courses: {
        INF: 358,
        MCT: 395,
        FMC: 356,
        TSI: 264,
        ECA: 269,
        PED: 815,
        MEST: 619,
    },
    subjectDetail: {
        url: 'edu/diario',
        tab: 'notas_faltas',
        ready: '#table_notas',
        students: {
            rows: '#table_notas tbody tr',
        }
    },
    studentProfile: {
        url: 'edu/aluno',
        ready: '.definition-list',
        email: {
            label: 'E-mail Acadêmico',
        }
    },
    professorProfile: {
        url: 'rh/servidor',
        ready: '.definition-list',
        email: {
            label: 'E-mail institucional',
        },
        name: {
            label: 'Nome',
        }
    },
};

export { suapConfig };