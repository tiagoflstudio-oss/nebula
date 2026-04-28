# 🛡️ Nebula AI - Protocolo de Segurança e Fidelidade (v3.0)

Este protocolo é a lei máxima de desenvolvimento deste projeto para evitar erros catastróficos e garantir a saúde do código e do usuário.

---

## 1. INTEGRIDADE ESTÉTICA (NON-NEGOTIABLE)
- **Proibido Deletar Estilos:** Nunca remova blocos de CSS para resolver erros técnicos. O design premium (Glassmorphism, gradients, etc.) deve ser preservado.
- **Trava de Sizing:** Ícones e elementos estruturais devem manter suas restrições de tamanho (max-width/height) para evitar layouts quebras de layout.

## 2. FLUXO DE TRABALHO SEGURO
- **Mudanças Incrementais:** Resolver apenas **UMA** coisa por vez. Não tente otimizar o código inteiro ao corrigir um erro pontual.
- **Validação Visual e de Lógica:** Antes de declarar uma tarefa concluída, o agente deve validar a interface e, obrigatoriamente, executar a skill `antigravity-self-audit` para garantir a integridade de imports e lógica.
- **Referência de Design:** A validação visual deve ser feita contra o Design System e prints de referência, garantindo fidelidade à estética "Mestre".

## 3. RESOLUÇÃO DE CONFLITOS E BACKUP
- **Zero Conflict Markers:** Nunca realizar commits que contenham marcadores de conflito do Git (`<<<<<<<`, `=======`, `>>>>>>>`).
- **Backup de CSS:** Antes de qualquer alteração grande no `App.css` ou `index.css`, o agente deve fazer uma leitura completa do arquivo para evitar truncamento.

## 4. COMUNICAÇÃO E HANDOVER
- **Commit Sob Demanda:** Commits no GitHub apenas com o comando explícito do usuário.
- **Protocolo de Handover:** Sempre que uma tarefa for interrompida ou ao final de uma sessão, o agente deve gerar/atualizar um arquivo `HANDOVER_TASK.md` com o status exato e próximos passos técnicos.
- **Transparência Total:** Se algo der errado, admita imediatamente e use o backup/git reset em vez de tentar consertos improvisados.

## 5. BLINDAGEM DE SEGREDOS (CLOUD-FIRST)
- **Zero Secret Exposure:** Nunca printar no chat, salvar em arquivos de texto ou expor no código frontend chaves secretas (`Client Secret`, `API Keys`, etc).
- **Gerenciamento via CLI:** Use sempre o comando `supabase secrets set` para gerenciar credenciais e referencie-as apenas por variáveis de ambiente seguras no backend (Edge Functions).

---
**ESTE PROTOCOLO VISA A SAÚDE DO PROJETO E A SAÚDE MENTAL DO USUÁRIO.**
