# Colgate Investimentos | Sorriso Financeiro

Plataforma de fidelização e simulação de investimentos da Colgate, construída com **Next.js 15** e **Gemini AI**.

## 🚀 Deploy no Vercel

### 1. Faça o deploy com um clique

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### 2. Configure as variáveis de ambiente

No painel do Vercel, acesse:  
**Project Settings → Environment Variables**

| Variável | Descrição | Obrigatório |
|---|---|---|
| `GEMINI_API_KEY` | Chave da API Gemini (Google AI Studio) | ✅ Sim |

> Obtenha sua chave em: https://aistudio.google.com/apikey

### 3. Deploy via CLI

```bash
# Instalar a CLI do Vercel (se necessário)
npm i -g vercel

# Fazer deploy de produção
vercel --prod
```

---

## 💻 Rodar Localmente

**Pré-requisitos:** Node.js 18+

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Crie o arquivo `.env.local` com sua chave da API:
   ```bash
   cp .env.example .env.local
   ```
   Edite `.env.local` e preencha `GEMINI_API_KEY` com sua chave.

3. Rode o app:
   ```bash
   npm run dev
   ```

4. Acesse em: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Tecnologias

- [Next.js 15](https://nextjs.org/) — Framework React com App Router
- [Gemini AI](https://ai.google.dev/) — IA Generativa (Dra. Sorriso)
- [Tailwind CSS v4](https://tailwindcss.com/) — Estilização
- [Framer Motion](https://www.framer.com/motion/) — Animações
- [Lucide React](https://lucide.dev/) — Ícones
