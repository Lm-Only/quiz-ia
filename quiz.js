/**
 * Sistema de quiz gerado por IA
 * Site: yuta-apis.xyz
 * Obter plano: yuta-apis.xyz/planos
 * 
 * @author Lm Only and Nk Petrov
 */

/** Site do yuta->API->Rota de IA */
const BASE_URL = 'https://yuta-apis.xyz/api/ias/';

/** Esse é o prompt que a IA vai ler conforme o query */
const PROMPT = 'query=%tema% \n\n' + 
    'Você é um gerador de quiz inteligente, você deve gerar um quiz conforme o parametro (query) e no final retornar uma JSON pura diretamente, exemplo: ' +
    'Tema: animais\n\n' +
    'Você retorna: ' + JSON.stringify({
        tema: "Animais",
        pergunta: "Qual animal terrestre tem listras pretas e brancas",
        opts: ["pato", "onça", "zebra"],
        resposta: "zebra"
    }, null, 2);

/** Isso vai servir pra caso uma der Error - ir passando pra proxima */
const IAS_DO_YUTA = [
    'gpt', // realmente essa é esperta
    'gemini-pro', // retorna errado mas vai que seja util
    'gemini',
    'perplexity-ai'
];

/**
 * Essa func adpta o texto prompt e mistura com o query
 * 
 * @param {string} query o tema pra ser adptado ao texto
 * @returns {string}
 */
function adapatePromt(query) {
    return PROMPT.replace('%tema%', query);
}

/**
 * Testa todas as IA de texto do Yuta apis
 * O Nk fortaleceu muito kkk por que o param query vale pra todas
 * Ou seja, menos trampo. Mas tem que mudar o prefix do yuta ae
 * 
 * @param {object} param0 tema e apitoken
 * @returns {Promise<{ tema: string, pergunta: string, opts: string[], resposta: string } | 'FALHOU_TUDO'>}
 * 
 * Tive que fazer isso em cima a mão pq não tem typescript
 */
async function requestAll({
    query,
    apitoken
}) {
    for (const iaName of IAS_DO_YUTA) {
    
        const url = new URL(BASE_URL + iaName);
        url.search = new URLSearchParams({ apitoken, query }).toString();
        
        try {
            const res = await fetch(url);
            const responseBody = await res.json();

            // status: false - api do yuta
            if (!responseBody.status) continue;

            const resposta = String(responseBody.resposta);

            // verificar se é um objeto JSON {}
            if (!resposta.startsWith('{') || !resposta.endsWith('}')) {
                continue; // se não for, vai pra próxima
            }

            return JSON.parse(resposta);
        } catch (error) {
            console.log('Falha na rota: ' + iaName);
            console.error(error);
        }
    }

    return 'FALHOU_TUDO';
}

/**
 * 
 * @param {<{ sendMessage }>} sock seu socket do bot man
 * @param {<{ groupID: string, quoted?: Record<any, any>, apitoken: string, query: string, enviarDireto: boolean }>} param1
 * @returns {Promise<quizResponse>}
 */
export async function gerarQuiz(sock = {}, {
    apitoken,
    query,
    groupID,
    quoted = {},
    enviarDireto = true // se não for bot de Whatsapp
}) {

    if (enviarDireto && (!sock?.sendMessage || typeof groupID !== 'string')) {
        throw 'Você não passou o socket do bot ou o groupID';
    }
    
    if (typeof query !== 'string' || typeof apitoken !== 'string') {
        throw 'Está faltando algo aí, ver qual paramêtro tá faltando entre: query, groupID ou apitoken. Ambos deve ser string';
    }

    const queryAdpted = adapatePromt(query);
    const quizResponse = await requestAll({ 
        query: queryAdpted,
        apitoken
    });

    if (!quizResponse || quizResponse === 'FALHOU_TUDO') {
        throw 'Quiz falhou com todas as IA';
    }

    const headerEnquete = '- *Tema*: ' + quizResponse.tema + '\n' +
        '- *Pergunta*: ' + quizResponse.pergunta;

    if (enviarDireto) {
        await sock.sendMessage(groupID, {
            poll: {
                name: headerEnquete,
                values: quizResponse.opts,
                selectableCount: 1
            }
        }, {
            quoted
        });
    }

    return quizResponse;
};
