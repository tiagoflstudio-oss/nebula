# 🛡️ Nebula AI - Protocolo de Segurança e Fidelidade

Este protocolo é a lei máxima de desenvolvimento deste projeto para evitar erros catastróficos e stress do usuário.

## 1. INTEGRIDADE ESTÉTICA (NON-NEGOTIABLE)
- **Proibido Deletar Estilos:** Nunca remova blocos de CSS para resolver erros técnicos. O design premium (Glassmorphism, gradients, etc.) deve ser preservado.
- **Trava de Sizing:** Ícones e elementos estruturais devem manter suas restrições de tamanho (max-width/height) para evitar layouts "gigantes".

## 2. FLUXO DE TRABALHO SEGURO
- **Mudanças Incrementais:** Resolver apenas **UMA** coisa por vez. Não tente otimizar o código inteiro ao corrigir um erro pontual.
- **Validação Visual Antes da Entrega:** O agente DEVE usar o `browser_subagent` para verificar se a interface local continua idêntica à versão de referência (Vercel) antes de declarar a tarefa como concluída.

## 3. RESOLUÇÃO DE CONFLITOS E SEGURANÇA
- **Zero Conflict Markers:** Nunca realizar commits que contenham marcadores de conflito do Git (`<<<<<<<`, `=======`, `>>>>>>>`).
- **Backup de CSS:** Antes de qualquer alteração grande no `App.css`, o agente deve fazer uma leitura completa do arquivo para garantir que não haverá truncamento ou perda de dados.

## 4. COMUNICAÇÃO E AUTORIZAÇÃO
- **Commit Sob Demanda:** Commits no GitHub apenas com o comando explícito do usuário.
- **Transparência Total:** Se algo der errado, admita imediatamente e use o backup/git reset em vez de tentar "consertos manuais" que piorem a situação.

---
**ESTE PROTOCOLO VISA A SAÚDE DO PROJETO E A SAÚDE MENTAL DO USUÁRIO.**
