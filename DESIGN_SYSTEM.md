# 🌌 Design System: Nebula AI (Premium Edition)

Este documento define a linguagem visual e os padrões de interface do ecossistema Nebula, garantindo uma experiência coesa, moderna e de alto nível.

---

## 🎨 Paleta de Cores (Mestre Tokens)
As cores foram selecionadas para criar profundidade cósmica e foco.

- **Background:** `#0a0b10` (Preto azulado profundo).
- **Primary Accent:** `#6366f1` (Indigo vibrante para ações principais).
- **Secondary Accent:** `#a855f7` (Purple vibrante para gradientes e estados).
- **Text Primary:** `#f8fafc` (Off-white para máxima legibilidade).
- **Text Secondary:** `#94a3b8` (Cinza azulado para descrições e desativações).
- **Glass BG:** `rgba(255, 255, 255, 0.03)` (Base para cartões translúcidos).

---

## 🖋️ Tipografia
- **Fonte Principal:** `Outfit` (Sans-serif geométrica e moderna).
- **Logo:** Peso 700 com efeito de gradiente Indigo-to-Purple.
- **Títulos:** Peso 600 com `letter-spacing: -0.02em`.
- **Corpo:** Peso 400 com `line-height: 1.6`.

---

## ✨ Efeitos e Animações (O "Vibe")

### 1. Glassmorphism
Todos os containers principais devem usar a classe `.glass`:
- **Blur:** `12px`.
- **Borda:** `1px solid rgba(255, 255, 255, 0.1)`.
- **Border Radius:** `24px` (Padrão para cards e modais).

### 2. Atmosfera Cósmica
- **Background Bubbles:** Bolhas de gradiente radial com desfoque de `40px`.
- **Animação Float:** Movimento orgânico lento (20s) para as bolhas de fundo.
- **Fade-in:** Entrada suave com `translateY(10px)` para todos os elementos de página.

---

## 🧩 Componentes Chave

### 1. Sidebar Premium
- Navegação vertical com ícones minimalistas.
- **Menu de Usuário:** Localizado no rodapé da sidebar usando um sistema de **Popover** para configurações e perfil.
- Estado `active`: Destaque com brilho lateral (glow) e fundo leve.

### 2. Chat OS
- Input de chat "flutuante" com bordas ultra-arredondadas.
- Streaming de texto com animação suave de digitação.
- Blocos de código com tema Dark "Nebula" e botão de cópia rápida.

### 3. Quota Tracker
- Progress bars com gradientes lineares.
- Suporte visual para status "Ilimitado/Enterprise" com brilho dourado ou indigo.

---
*Atualizado por Antigravity em 2026-04-28*
