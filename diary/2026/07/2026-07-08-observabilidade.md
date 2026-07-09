# Project DevLog: nebula
* **📅 Date**: 2026-07-08
* **🏷️ Tags**: `#Observability` `#TenantHealth` `#SaaS` `#AlertRules` `#Heartbeats` `#PremiumUI`

---

> 🎯 **Progress Summary**
> Consolidamos o Módulo 1 do roadmap de Observabilidade do Nebula (Tenant Health & SLAs). Implementamos a detecção ativa de inatividade de clientes (Dead-Man's Switch / Heartbeats) integrada ao sistema de alertas reativos existente e construímos a tela administrativa de saúde operacional dos Tenants (clientes) com design premium.

### 🛠️ Execution Details & Changes
* **Core File Modifications**:
  * 📄 `supabase/migrations/20260709000000_create_heartbeats_and_health_functions.sql`: Nova migração criando a tabela `service_heartbeats`, RLS com políticas de dono/admin, trigger automática de sinais vitais e procedure de timeout `check_service_heartbeats`.
  * 📄 `supabase/functions/check-heartbeats/index.ts`: Nova Edge Function em Deno para acionar a procedure SQL de verificação e propagar de forma assíncrona alertas via `process-alert`.
  * 📄 `src/services/observabilityService.js`: Adição de métodos de busca e processamento de dados (`getTenantHealthScores` e `getServiceHeartbeats`).
  * 📄 `src/pages/TenantHealthPage.jsx`: Nova página administrativa com cards de resumo, scores de integridade de transações por cliente e tabela de status de conexão dos heartbeats.
  * 📄 `src/pages/TenantHealthPage.css`: Estilização glassmorphic com efeitos de brilho neon para visualização rápida de clientes críticos.
  * 📄 `src/App.jsx`: Registro e importação lazy da nova rota `TenantHealthPage` no roteador principal.
  * 📄 `src/components/Sidebar.jsx`: Adição do botão de navegação "Saúde Clientes" no menu lateral com ícone Feather de coração.
* **Technical Implementation**:
  * **Dead-Man's Switch**: Tabela `service_heartbeats` e trigger SQL que escuta a tabela de auditoria global do Supabase (`audit_logs`) e atualiza automaticamente os batimentos de clientes em tempo real.
  * **Varredura e Alerta Reativo**: Procedure PL/pgSQL que altera o status para `offline` de heartbeats vencidos e gera um log de severidade `critical`, disparando automaticamente a engrenagem de alertas reativos.
  * **Algoritmo de Health Score**: Cálculo dinâmico do score dividindo a quantidade de requisições de sucesso (info, debug, warn) pelo total de eventos do cliente nas últimas 24 horas.

### 🚨 Troubleshooting
> 🐛 **Problem Encountered**: Erro ao gravar o arquivo de migração e a nova página do frontend devido a caminhos fora da sandbox dos artefatos utilizando o write_to_file.
> 💡 **Solution**: Correção nas chamadas da ferramenta `write_to_file` omitindo o `ArtifactMetadata` para arquivos normais de código do projeto, permitindo a gravação de arquivos fora do diretório do conversation-id.

### ⏭️ Next Steps
- [x] Implementar a migração do banco de dados contendo `service_heartbeats` (Módulo 1).
- [x] Criar Edge Function `check-heartbeats` para automação de timeouts.
- [x] Criar a visualização e dashboard no frontend para saúde de tenants e heartbeats.
- [ ] Agendar a execução recorrente da Edge Function `check-heartbeats` (via pg_cron ou cronjob externo).
- [ ] Iniciar planejamento do Módulo 2: APM de Performance (latência de endpoints e gráficos de séries temporais de RPS).
- [ ] Implementar integração real com Evolution API e Resend para notificações de alerta de inatividade de clientes.
