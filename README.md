# Quiz IA (Yuta APIs)

Um módulo simples e direto para **gerar quizzes com IA** e, opcionalmente, **enviar como enquete** (poll) via bot.

Este repositório contém:

- `quiz.js` → versão original em JavaScript
- `quiz.ts` → versão em TypeScript com tipagem reforçada, validações e estrutura mais modular

---

## ✨ O que esse módulo faz

A função principal (`gerarQuiz`) recebe um tema (`query`) e um token (`apitoken`), consulta modelos de IA da Yuta APIs em ordem de fallback e retorna um objeto de quiz no formato:

- `tema`
- `pergunta`
- `opts` (opções)
- `resposta`

Se você quiser, ela também já envia a pergunta como enquete em grupo (ex.: WhatsApp) usando `sock.sendMessage`.

---

## 🧠 Fluxo de funcionamento

1. Adapta o prompt base com o tema informado.
2. Tenta múltiplos modelos de IA da Yuta (`gpt`, `gemini-pro`, `gemini`, `perplexity-ai`).
3. Valida se o retorno é JSON de objeto.
4. No TypeScript, valida também a estrutura final com type guard.
5. Retorna o quiz e (se habilitado) envia a poll no grupo.

---

## 📦 Requisitos

- Node.js com suporte a `fetch` global (Node 18+) **ou** polyfill de `fetch`.
- Token válido da Yuta APIs (`apitoken`).

---

## 🚀 Como usar (TypeScript recomendado)

### 1) Importar

```ts
import { gerarQuiz } from './quiz';
```

### 2) Gerar quiz sem envio direto

```ts
const quiz = await gerarQuiz({}, {
  apitoken: 'SEU_TOKEN',
  query: 'Animais brasileiros',
  enviarDireto: false
});

console.log(quiz);
```

### 3) Gerar quiz e enviar como enquete

```ts
const sock = {
  sendMessage: async (groupID: string, payload: any, options?: any) => {
    // implemente com sua lib de bot
  }
};

await gerarQuiz(sock, {
  apitoken: 'SEU_TOKEN',
  query: 'Geografia do Brasil',
  groupID: '1203630xxxx@g.us',
  quoted: {},
  enviarDireto: true
});
```

---

## 🧩 Assinatura da função (TS)

```ts
gerarQuiz(
  sock?: Partial<BotSocket>,
  params: {
    apitoken: string;
    query: string;
    groupID?: string;
    quoted?: Record<string, unknown>;
    enviarDireto?: boolean;
  }
): Promise<QuizResponse>
```

### `QuizResponse`

```ts
interface QuizResponse {
  tema: string;
  pergunta: string;
  opts: string[];
  resposta: string;
}
```

---

## ⚠️ Regras importantes

- Se `enviarDireto: true`, você **precisa** passar:
  - `groupID` válido
  - `sock.sendMessage` implementado
- Se todas as IAs falharem, a função lança erro.
- O módulo espera que a IA retorne JSON de objeto no campo `resposta`.

---

## 🛡️ Melhorias da versão TypeScript (`quiz.ts`)

- Tipos explícitos para entrada e saída.
- Validação de parâmetros com mensagens claras.
- Parsing JSON defensivo (`EMPTY`, `NOT_JSON_OBJECT`, `INVALID_JSON`).
- Type guard para garantir formato de `QuizResponse`.
- Organização por responsabilidades (helpers, validações e fluxo principal).

---

## 📁 Estrutura atual

```txt
.
├─ quiz.js
├─ quiz.ts
└─ README.md
```

---

## 🔗 Referências

- Site: [yuta-apis.xyz](https://yuta-apis.xyz)
- Planos: [yuta-apis.xyz/planos](https://yuta-apis.xyz/planos)

---

## 👨‍💻 Autores

- **Lm Only**
- **Nk Petrov**

---

Se quiser, no próximo passo eu posso criar também uma seção de **FAQ** no README com erros comuns e como resolver rapidamente.