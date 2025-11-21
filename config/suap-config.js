export default {
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
    }
    // professorSearch: {
    //     url: 'admin/edu/professor/',
    //     query: {
    //         vinculo__setor__uo: 4, // campus CH
    //         q: 'USERDATA',
    //         tab: 'tab_any_data'
    //     },
    //     ready: 'table#result_list, #changelist-form .msg.alert',
    //     rows: 'table#result_list tr',
    //     hasRows: 'td.field-get_dados_gerais dd',
    //     data: {
    //         id: (tr) => parseInt(tr.querySelector('th a.icon-view')?.href.match(/\/edu\/professor\/(\d*)\//)[1]),
    //         name: (tr) => tr.querySelectorAll('td.field-get_dados_gerais dd')?.[0]?.textContent.trim(),
    //         cpf: (tr) => tr.querySelectorAll('td.field-get_dados_gerais dd')?.[1]?.textContent.trim(),
    //         email: (tr) => tr.querySelectorAll('td.field-get_dados_gerais dd')?.[3]?.textContent.trim(),
    //         siape: (tr) => tr.querySelector('td.field-display_matricula')?.textContent.trim(),
    //         picture: (tr) => tr.querySelector('td.field-get_foto img')?.src,
    //     }
    // },
    // professorFunctionalPage: {
    //     url: 'rh/servidor',
    //     ready: '.definition-list',
    //     item: '.definition-list .list-item dd',
    // },
    // bookSearch: {
    //     // `edu/professor/${professorId}/?tab=disciplinas&ano-periodo=${semester}`
    //     url: {
    //         base: 'edu/professor',
    //         query: 'tab=disciplinas&ano-periodo='
    //     },
    //     ready: '#form_periodo_letivo',
    //     rows: '.box table tr',
    //     data: {
    //         semester: (tr) => tr.querySelectorAll('td')?.[0]?.textContent.trim(),
    //         link: (tr) => tr.querySelectorAll('td')?.[1]?.querySelector('a')?.href,
    //         book: (tr) => tr.querySelectorAll('td')?.[1]?.textContent.trim(),
    //         class: (tr) => tr.querySelectorAll('td')?.[2]?.textContent.trim(),
    //     }
    // },
    // bookDetails: {
    //     // `edu/registrar_chamada/${bookId}/${period}/`
    //     url: 'edu/registrar_chamada',
    //     ready: '#table_registro_aula, .box .msg.alert',
    //     rows: '#table_registro_aula tr',
    //     data: (tr) => Array.from(tr.querySelectorAll('th, td')).map(td => td.textContent.trim()),
    // },
    // programMapping: {
    //     INF: 'CH.INF_I - Curso Técnico em Informática - Integrado (CH 2008) (Campus Charqueadas)',
    //     MCT: 'CH.MCT_I - Curso Técnico em Mecatrônica - Integrado (CH 2007) (Campus Charqueadas)',
    //     LP: 'CH.LP_ - Curso de Licenciatura em Pedagogia 2023/1- Câmpus Charqueadas (Campus Charqueadas)',
    //     ECA: 'CH.ECA - Curso Superior em Engenharia de Controle e Automação (Campus Charqueadas)',
    //     FMC: 'CH.FMC_EJA - Técnico em Fabricação Mecânica - EJA - Charqueadas (Campus Charqueadas)',
    //     TSI: 'CH.TSI - Curso Superior de Tecnologia em Sistemas para Internet (Campus Charqueadas)',
    // },
    // documentBuilder: {
    //     city: 'Charqueadas',
    //     depex: 'Lisiane Araujo Pinheiro',
    // }
}