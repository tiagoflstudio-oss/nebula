# 🛡️ Nebula AI - Design Guardrails

Este documento serve como regra mandatória para qualquer IA ou desenvolvedor atuando neste projeto.

## 1. NUNCA SACRIFIQUE O DESIGN POR CÓDIGO "LIMPO"
É expressamente proibido deletar seletores CSS, variáveis de tema ou componentes de interface com o objetivo de resolver erros de compilação ou conflitos. Se houver um erro técnico, a solução deve ser aplicada **preservando integralmente** a estética premium atual.

## 2. MANUTENÇÃO DO ESTILO PREMIUM
Qualquer alteração deve respeitar o sistema de design:
- **Glassmorphism:** Manter os efeitos de blur e transparência.
- **Iconografia:** Ícones devem manter tamanhos controlados (16px-22px) e nunca se expandirem.
- **Paleta de Cores:** Respeitar o esquema Dark/Minimalist definido no `:root`.

## 3. AUDITORIA VISUAL OBRIGATÓRIA
Após qualquer correção de erro, deve-se realizar uma auditoria visual para garantir que elementos como Sidebar, Navbar e AdminPanel não foram deslocados ou desconfigurados.

## 4. RESOLUÇÃO DE CONFLITOS
Marcadores de conflito devem ser resolvidos manualmente, escolhendo sempre a versão que mantém a funcionalidade **E** o design aprovado.

---
**ESTA REGRA É MANDATÓRIA. FALHAR NESTA REGRA É UMA FALHA NO PROJETO.**
