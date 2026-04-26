# 🌌 Nebula AI: Design & Architecture Guardrails

Este documento serve como a "Fonte da Verdade" para o design e comportamento do ecossistema Nebula.

## 🎨 Estética "Nebula Premium"
- **Glassmorphism**: Uso extensivo de `backdrop-filter: blur(20px)` com fundos semi-transparentes (`rgba(15, 17, 26, 0.7)`).
- **Cores de Destaque**: Paleta baseada em Violeta, Indigo e Azul Vibrante (`#a78bfa`, `#818cf8`).
- **Minimalismo Extremo**: Eliminação de "balões" pesados. A interface deve parecer flutuar sobre o fundo cósmico.
- **Animações**: Transições suaves de escala, `fade-in` e `slide-up` para todos os elementos novos.

## ✍️ Tipografia da Assistente
- **Fonte Exclusiva**: Respostas da IA devem usar `'Inter', Arial, sans-serif` para um visual técnico e limpo.
- **Tamanho**: `0.85rem` para otimizar espaço.
- **Espaçamento**: `line-height: 1.5` e margem entre parágrafos de no máximo `8px`. O objetivo é densidade de informação sem poluição.

## 📐 Componentes Estruturais
- **Navbar**: Transparente, sem fundo de "cápsula", apenas uma borda inferior sutil (`1px solid rgba(255, 255, 255, 0.05)`).
- **Sidebar**: Focada em ações. Botão de "Nova Conversa" no topo, sem avatar de usuário para manter o foco total na produtividade.
- **Modais**: Sistema Premium com desfoque de fundo, botões arredondados e campos de texto minimalistas.

## 💾 Persistência e Dados
- **Single Source of Truth**: As configurações do sistema (API Keys, Motor SSH, IPs) devem ser salvas no **Supabase** (Tabela `profiles`, coluna `settings` JSONB).
- **LocalStorage**: Usado apenas como cache rápido e fallback imediato no carregamento inicial.
- **Sincronização**: O botão "Sincronizar Motores" é o gatilho principal para salvar estados na nuvem.

## 🧠 Engine (IA Engine)
- **Flexibilidade**: Suporte a múltiplos provedores (Ollama, OpenAI, Anthropic, Gemini).
- **Campos Técnicos**: Textareas de chaves (como SSH) devem ser expansíveis e usar fontes monoespaçadas.

---
*Assinado: Nebula Guardrail Protocol v2.0*
