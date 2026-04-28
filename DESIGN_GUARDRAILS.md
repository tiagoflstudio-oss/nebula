# 🌌 Nebula AI: Design & Architecture Guardrails

Este documento serve como a "Fonte da Verdade" para o design, comportamento e segurança do ecossistema Nebula.

---

## 🎨 Estética "Nebula Premium"
- **Glassmorphism:** Uso mandatório de `backdrop-filter: blur(12px)` com fundos ultra-leves (`rgba(255, 255, 255, 0.03)`).
- **Cores de Destaque:** Uso balanceado de Indigo e Purple vibrantes. Evitar cores primárias puras (Red/Blue/Green) sem tratamento de brilho.
- **Espaçamento:** Bordas de `24px` para elementos grandes e `12px` para pequenos. Tudo deve ter "ar" para respirar.
- **Feedback Visual:** Hover states devem ser sutis, preferencialmente usando mudança de opacidade ou brilho suave de borda.

## 🔒 Segurança e Autenticação (A Nova Lei)
- **Zero Secret Exposure:** NUNCA manter `client_secret` ou `api_key` no código frontend.
- **Edge Functions:** Todas as trocas de token sensíveis e renovações devem passar pelo Supabase Edge Functions.
- **Secrets Management:** Credenciais de provedores (Google/GitHub/etc) devem ser armazenadas exclusivamente como **Secrets** no Supabase CLI.

## 📐 Componentes e UX
- **Sidebar:** Deve conter o menu de navegação e o Popover de Perfil do usuário.
- **Settings:** O fluxo de conexão deve ser "One-Click" sempre que possível, guiando o usuário através da Edge Function de autenticação.
- **Quota Tracker:** Erros de conexão devem ser informativos, sugerindo comandos específicos (ex: `npm run bridge`) em vez de alertas genéricos.

## 💾 Persistência e Dados
- **Tabela de Conexões:** A tabela `provider_connections` no Supabase é a fonte única de verdade para tokens e configurações de provedores.
- **Auto-Refresh:** O sistema deve tentar renovar tokens automaticamente usando o `refresh_token` armazenado antes de qualquer chamada de cota.
- **Local Bridge:** O `nebula-bridge.js` é o fallback para ambientes de desenvolvimento e integração local (ADC), operando na porta `3001`.

## 🧠 Engine de Inteligência
- **Modularidade:** O sistema deve ser agnóstico a modelos, permitindo troca rápida entre Gemini, Ollama, Claude e Antigravity.
- **Prompt Engineering:** Manter a persona "Mestre Clientes" (Eficiente, Estética, Estratégica) em todas as interações de IA.

---
*Assinado: Nebula Guardrail Protocol v3.0 (Mestre Update)*
