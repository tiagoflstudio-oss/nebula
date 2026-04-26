# 專案上下文 (Agent Context)：nebula

> **最後更新時間**：2026-04-26 06:06
> **自動生成**：由 `prepare_context.py` 產生，供 AI Agent 快速掌握專案全局

---

## 🎯 1. 專案目標 (Project Goal)
* **核心目的**：Nebula AI é uma interface web minimalista projetada para se conectar a instâncias locais do Ollama. Com um design focado em estética premium, utiliza efeitos de glassmorphism e animações fluidas para proporcionar uma experiência de uso relaxante e produtiva.
* _完整說明見 [README.md](README.md)_

## 🛠️ 2. 技術棧與環境 (Tech Stack & Environment)
* **核心套件**：@supabase/supabase-js, cors, express, react, react-dom, react-markdown, react-router-dom, systeminformation
* **開發套件**：@eslint/js, @types/react, @types/react-dom, @vitejs/plugin-react, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals
* **可用指令**：dev, build, lint, preview

### 原始設定檔

<details><summary>package.json</summary>

```json
{
  "name": "nebula-ai",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.104.1",
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.14.2",
    "systeminformation": "^5.31.5"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^10.2.1",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.5.0",
    "vite": "^8.0.10"
  }
}

```
</details>

<details><summary>.env.example</summary>

```text
<<<<<<< HEAD
VITE_SUPABASE_URL=sua_url_do_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
=======
VITE_SUPABASE_URL=seu_projeto_supabase_url
VITE_SUPABASE_ANON_KEY=seu_projeto_anon_key
>>>>>>> a9f69f60651e849b991e733636d692f1d68c0024

```
</details>

## 📂 3. 核心目錄結構 (Core Structure)
_(💡 AI 讀取守則：請依據此結構尋找對應檔案，勿盲目猜測路徑)_
```text
nebula/
├── AGENT_CONTEXT.md
├── DESIGN_GUARDRAILS.md
├── DESIGN_SYSTEM.md
├── README.md
├── SAFETY_PROTOCOL.md
├── diary
│   └── 2026
│       └── 04
├── eslint.config.js
├── index.html
├── nebula-bridge.cjs
├── package-lock.json
├── package.json
├── public
│   ├── favicon.svg
│   └── icons.svg
├── src
│   ├── App.css
│   ├── App.css_original
│   ├── App.css_restored
│   ├── App.jsx
│   ├── assets
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components
│   │   ├── AdminPanel.jsx
│   │   ├── Auth.jsx
│   │   ├── Background.jsx
│   │   ├── Chat.jsx
│   │   ├── MasterOS.jsx
│   │   ├── Modal.jsx
│   │   ├── Navbar.jsx
│   │   ├── QuotaCard.css
│   │   ├── QuotaCard.jsx
│   │   └── Sidebar.jsx
│   ├── index.css
│   ├── lib
│   │   └── supabaseClient.js
│   ├── main.jsx
│   ├── pages
│   │   ├── AdminPage.jsx
│   │   ├── AllChatsPage.css
│   │   ├── AllChatsPage.jsx
│   │   ├── OptimizerPage.jsx
│   │   ├── ProjectPage.jsx
│   │   ├── ProjectsListPage.jsx
│   │   ├── QuotaPage.css
│   │   ├── QuotaPage.jsx
│   │   ├── RoadmapPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── SupportPage.jsx
│   └── services
│       ├── oauthService.js
│       └── quotaService.js
├── supabase_provider_connections.sql
└── vite.config.js
```

## 🏛️ 4. 架構與設計約定 (Architecture & Conventions)
* _（尚無 `.auto-skill-local.md`，專案踩坑經驗將在開發過程中自動累積）_

## 🚦 5. 目前進度與待辦 (Current Status & TODO)
_(自動提取自最近日記 2026-04-26)_

### 🚧 待辦事項
- [ ] Validar a persistência automática dos tokens OAuth (Auto-refresh) via `refreshProviderToken`.
- [ ] Implementar a lógica de "Vida Burocrática Brasileira" no motor de prompts.
- [ ] Refinar o componente de "Suporte Emocional Estruturado" com o novo padrão de UI.
- [ ] Realizar revisão final de segurança nas políticas RLS do Supabase para a tabela `provider_tokens`.

