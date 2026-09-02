/**
 * Sistema de quiz gerado por IA (TypeScript)
 * Site: yuta-apis.xyz
 * Obter plano: yuta-apis.xyz/planos
 *
 * Refatorado para TypeScript puro, modular e com tipagem reforçada.
 *
 * @author Lm Only and Nk Petrov
 */

/** URL base das rotas de IA da Yuta APIs */
const BASE_URL = 'https://yuta-apis.xyz/api/ias/';

/**
 * Prompt base utilizado para instruir a IA a retornar JSON puro.
 * O placeholder `%tema%` será substituído pelo tema informado no `query`.
 */
const PROMPT_TEMPLATE =
  'query=%tema% \n\n' +
  'Você é um gerador de quiz inteligente, você deve gerar um quiz conforme o parametro (query) e no final retornar uma JSON pura diretamente, exemplo: ' +
  'Tema: animais\n\n' +
  'Você retorna: ' +
  JSON.stringify(
    {
      tema: 'Animais',
      pergunta: 'Qual animal terrestre tem listras pretas e brancas',
      opts: ['pato', 'onça', 'zebra'],
      resposta: 'zebra'
    },
    null,
    2
  );

/**
 * Ordem de fallback entre modelos de IA.
 * Se uma rota falhar ou retornar formato inválido, tenta a próxima.
 */
const YUTA_AI_MODELS = ['gpt', 'gemini-pro', 'gemini', 'perplexity-ai'] as const;

/**
 * Estrutura esperada do quiz retornado pela IA.
 */
export interface QuizResponse {
  tema: string;
  pergunta: string;
  opts: string[];
  resposta: string;
}

/**
 * Estrutura mínima do retorno da API da Yuta.
 * `resposta` pode vir em formatos diferentes dependendo do provedor.
 */
interface YutaApiResponse {
  status?: boolean;
  resposta?: unknown;
}

/**
 * Contrato mínimo do socket utilizado para envio de enquete.
 */
export interface BotSocket {
  sendMessage: (
    groupID: string,
    payload: {
      poll: {
        name: string;
        values: string[];
        selectableCount: number;
      };
    },
    options?: {
      quoted?: Record<string, unknown>;
    }
  ) => Promise<unknown>;
}

/**
 * Parâmetros aceitos pela função principal de geração de quiz.
 */
export interface GerarQuizParams {
  apitoken: string;
  query: string;
  groupID?: string;
  quoted?: Record<string, unknown>;
  enviarDireto?: boolean;
}

/**
 * Resultado interno da tentativa de parsing JSON.
 */
type ParseJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'EMPTY' | 'NOT_JSON_OBJECT' | 'INVALID_JSON' };

/**
 * Substitui o placeholder `%tema%` no prompt base.
 */
function adaptPrompt(query: string): string {
  return PROMPT_TEMPLATE.replace('%tema%', query);
}

/**
 * Type guard para validar se um valor desconhecido possui formato de `QuizResponse`.
 */
function isQuizResponse(value: unknown): value is QuizResponse {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<QuizResponse>;

  const hasValidTema = typeof candidate.tema === 'string' && candidate.tema.trim().length > 0;
  const hasValidPergunta = typeof candidate.pergunta === 'string' && candidate.pergunta.trim().length > 0;
  const hasValidOpts =
    Array.isArray(candidate.opts) &&
    candidate.opts.length > 0 &&
    candidate.opts.every((opt) => typeof opt === 'string' && opt.trim().length > 0);
  const hasValidResposta =
    typeof candidate.resposta === 'string' && candidate.resposta.trim().length > 0;

  return hasValidTema && hasValidPergunta && hasValidOpts && hasValidResposta;
}

/**
 * Tenta converter texto em objeto JSON com validações defensivas.
 */
function parseJsonObject<T>(raw: unknown): ParseJsonResult<T> {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return { ok: false, reason: 'EMPTY' };
  }

  const text = raw.trim();

  if (!text.startsWith('{') || !text.endsWith('}')) {
    return { ok: false, reason: 'NOT_JSON_OBJECT' };
  }

  try {
    const parsed = JSON.parse(text) as T;
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, reason: 'INVALID_JSON' };
  }
}

/**
 * Faz request em um modelo específico de IA da Yuta APIs.
 */
async function requestYutaModel(model: (typeof YUTA_AI_MODELS)[number], apitoken: string, query: string): Promise<QuizResponse | null> {
  const url = new URL(BASE_URL + model);
  url.search = new URLSearchParams({ apitoken, query }).toString();

  const response = await fetch(url);
  const body = (await response.json()) as YutaApiResponse;

  if (!body?.status) return null;

  const parsed = parseJsonObject<unknown>(body.resposta);
  if (!parsed.ok) return null;

  return isQuizResponse(parsed.data) ? parsed.data : null;
}

/**
 * Tenta todas as IAs configuradas e retorna o primeiro quiz válido.
 */
async function requestAll(params: { query: string; apitoken: string }): Promise<QuizResponse | null> {
  const { query, apitoken } = params;

  for (const model of YUTA_AI_MODELS) {
    try {
      const quiz = await requestYutaModel(model, apitoken, query);
      if (quiz) return quiz;
    } catch (error) {
      console.error(`[quiz.ts] Falha na rota: ${model}`, error);
    }
  }

  return null;
}

/**
 * Cria o cabeçalho textual exibido na enquete.
 */
function buildPollHeader(quiz: QuizResponse): string {
  return `- *Tema*: ${quiz.tema}\n- *Pergunta*: ${quiz.pergunta}`;
}

/**
 * Gera um quiz via IA e, opcionalmente, envia como enquete no bot.
 *
 * @param sock Socket do bot (obrigatório apenas quando `enviarDireto` for true)
 * @param params Parâmetros de geração/envio do quiz
 * @returns Quiz validado no formato tipado
 */
export async function gerarQuiz(
  sock: Partial<BotSocket> = {},
  params: GerarQuizParams
): Promise<QuizResponse> {
  const {
    apitoken,
    query,
    groupID,
    quoted = {},
    enviarDireto = true
  } = params;

  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Parâmetro "query" inválido. Informe uma string não vazia.');
  }

  if (typeof apitoken !== 'string' || apitoken.trim().length === 0) {
    throw new Error('Parâmetro "apitoken" inválido. Informe uma string não vazia.');
  }

  if (enviarDireto) {
    if (typeof groupID !== 'string' || groupID.trim().length === 0) {
      throw new Error('Parâmetro "groupID" inválido para envio direto.');
    }

    if (typeof sock.sendMessage !== 'function') {
      throw new Error('Socket inválido: método "sendMessage" não foi informado.');
    }
  }

  const adaptedQuery = adaptPrompt(query);
  const quiz = await requestAll({ query: adaptedQuery, apitoken });

  if (!quiz) {
    throw new Error('Quiz falhou com todas as IA.');
  }

  if (enviarDireto && groupID && typeof sock.sendMessage === 'function') {
    await sock.sendMessage(
      groupID,
      {
        poll: {
          name: buildPollHeader(quiz),
          values: quiz.opts,
          selectableCount: 1
        }
      },
      { quoted }
    );
  }

  return quiz;
}
