# 🌌 Contexto do Agente: Nebula AI

> **Última Atualização**: 2026-04-28
> **Status**: Evoluindo de interface Ollama para OS de IA Multi-Provedor (OAuth)

---

## 🎯 1. Objetivos do Projeto
* **Missão**: O Nebula AI é um ecossistema de produtividade premium que atua como um "Sistema Operacional de IA". Iniciou como interface para Ollama e está evoluindo para um Hub completo com suporte a provedores externos (Google Gemini/Antigravity, GitHub, Claude) via OAuth seguro.
* **Estética**: Design focado em Glassmorphism, animações fluidas e uma experiência de usuário de alto nível (Estilo Mestre Clientes).

## 🛠️ 2. Stack Tecnológica
* **Frontend**: React 19 + Vite (Vanilla CSS para design system).
* **Backend**: Supabase (Database, Auth, Edge Functions).
* **Integração Local**: `nebula-bridge.js` (Proxy para métricas de sistema e auto-token ADC do Google Cloud).
* **Auth**: Fluxo OAuth 2.0 migrando para Supabase Edge Functions para segurança (PKCE/Secret handling).

## 📂 3. Estrutura de Diretórios
```text
nebula/
├── src/
│   ├── components/       # Componentes globais (Sidebar, Chat, QuotaCard)
│   ├── pages/            # Páginas principais (Settings, Quota, Admin)
│   ├── services/         # Lógica de API (oauthService, quotaService)
│   └── lib/              # Clientes de infra (supabaseClient)
├── supabase/
│   └── functions/        # Edge Functions (oauth-exchange)
├── nebula-bridge.js      # Proxy local (Porta 3001) para ADC e Métricas
├── .antigravity_context.md # Instruções de comportamento do agente
├── HANDOVER_OAUTH.md     # Log de migração da infraestrutura de autenticação
└── AGENT_CONTEXT.md      # Este arquivo (Visão Geral)
```

## 🚦 4. Estado Atual e Roadmap
*(Atualizado em 2026-04-28)*

### ✅ Concluído Recentemente
- [x] Implementação da `nebula-bridge.js` para auto-renovação de tokens via gcloud local.
- [x] Refatoração do `QuotaCard` para suporte a Planos Ilimitados (Enterprise).
- [x] Criação da Edge Function `oauth-exchange` para fluxo OAuth seguro.
- [x] Integração do "One-Click Login" na página de configurações para Antigravity.

### 🚧 Em Andamento (Pausa Atual)
- [ ] Concluir deploy da Edge Function `oauth-exchange` (aguardando client_secret).
- [ ] Refatorar `oauthService.js` para usar a Edge Function em vez de chamadas diretas.
- [ ] Implementar sistema de RAG (Mestre Clientes) com banco vetorial (PgVector).

### 📋 Próximos Passos
1. Validar fluxo OAuth fim-a-fim sem dependência do terminal local.
2. Iniciar indexação de documentos para o módulo de Conhecimento (RAG).
3. Refinar menu Popover na Sidebar.

---
*Este arquivo serve como a "Memória de Curto Prazo" para o Agente Antigravity.*
