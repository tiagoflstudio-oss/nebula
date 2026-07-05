import { supabase } from '../lib/supabaseClient';

const SENTRY_AUTH_TOKEN = import.meta.env.VITE_SENTRY_AUTH_TOKEN;
const SENTRY_ORG = import.meta.env.VITE_SENTRY_ORG || 'confia-saas';
const SENTRY_PROJECT = import.meta.env.VITE_SENTRY_PROJECT || 'confia-nextjs';

export const sentryService = {
  /**
   * Obtém issues/erros técnicos recentes do Sentry.
   * Se a chave VITE_SENTRY_AUTH_TOKEN não estiver configurada no .env,
   * gera um mock inteligente correlacionado com os logs de erro do banco.
   */
  async getRecentSentryIssues(projectConfig = {}) {
    const org = projectConfig.sentry_org || SENTRY_ORG;
    const project = projectConfig.sentry_project || SENTRY_PROJECT;

    // 1. Caso haja credenciais configuradas, busca na API oficial do Sentry
    if (SENTRY_AUTH_TOKEN) {
      try {
        console.log(`🌐 Sentry: Buscando erros reais via API para ${org}/${project}`);
        const response = await fetch(
          `https://sentry.io/api/0/projects/${org}/${project}/events/`,
          {
            headers: {
              'Authorization': `Bearer ${SENTRY_AUTH_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const events = await response.json();
          return events.map(evt => {
            const traceTag = evt.tags?.find(t => t.key === 'trace_id');
            return {
              id: `sentry-${evt.id}`,
              source: 'sentry',
              title: evt.title || evt.message || 'Erro Técnico (Sentry)',
              message: evt.message || evt.title,
              level: evt.level === 'fatal' ? 'critical' : 'error',
              trace_id: traceTag ? traceTag.value : null,
              created_at: evt.dateCreated || evt.timestamp,
              metadata: {
                culprit: evt.culprit,
                sentry_url: `https://sentry.io/organizations/${org}/issues/?query=${evt.id}`,
                sdk: evt.sdk,
                user: evt.user,
                release: evt.release
              }
            };
          });
        } else {
          console.warn('⚠️ Sentry: Falha ao obter dados da API REST. Status:', response.status);
        }
      } catch (err) {
        console.error('❌ Sentry: Falha de comunicação de rede:', err);
      }
    }

    // 2. Mock Inteligente de Desenvolvimento (para validar correlação sem API Token)
    // Coleta os logs de erro reais recentes do banco de dados e cria registros do Sentry equivalentes
    try {
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('source_project', 'confia')
        .in('level', ['error', 'critical'])
        .gte('created_at', past24h)
        .limit(10);

      const mockIssues = [];

      // Dicionário de erros técnicos simulados associados aos serviços do Confia
      const serviceTechnicalErrors = {
        billing: [
          { title: "Error: Asaas payment API response timeout (504)", culprit: "lib/actions/billing.ts:84" },
          { title: "PrismaClientKnownRequestError: Unique constraint failed on billing_subscriptions", culprit: "lib/actions/smart-billing.ts:142" }
        ],
        nfe: [
          { title: "NFSeAPIError: Rejected by Sefaz (Signature Verification Failed)", culprit: "lib/actions/nfe-sender.ts:204" },
          { title: "TypeError: Cannot read properties of undefined (reading 'status')", culprit: "lib/actions/nfe-sync.ts:47" }
        ],
        'pdv-sync': [
          { title: "WebSocketError: Network connection closed unexpectedly", culprit: "hooks/use-pdv-sync.ts:112" },
          { title: "PostgresError: Connection limit exceeded for client sync pool", culprit: "lib/db.ts:33" }
        ],
        whatsapp: [
          { title: "EvolutionAPIError: Instance offline or session expired (400)", culprit: "lib/whatsapp.ts:67" }
        ],
        'ai-collections': [
          { title: "AnthropicAPIError: Overloaded or rate limit exceeded (529)", culprit: "lib/actions/ai-collections.ts:210" }
        ]
      };

      if (logs && logs.length > 0) {
        logs.forEach((log, index) => {
          const errors = serviceTechnicalErrors[log.service] || [
            { title: `Error: Internal Server Failure in service '${log.service}'`, culprit: `lib/actions/${log.service}.ts:108` }
          ];
          const errorTemplate = errors[index % errors.length];

          mockIssues.push({
            id: `sentry-mock-${log.id}`,
            source: 'sentry',
            title: errorTemplate.title,
            message: `${errorTemplate.title} no arquivo ${errorTemplate.culprit}`,
            level: log.level,
            trace_id: log.trace_id, // Propaga o mesmo trace_id do log de negócio!
            created_at: new Date(new Date(log.created_at).getTime() + 1200).toISOString(), // Ocorre 1.2 segundos após o log de negócio
            metadata: {
              culprit: errorTemplate.culprit,
              sentry_url: `https://sentry.io/organizations/${org}/issues/mock-issue-${index}/`,
              sdk: { name: "sentry.javascript.nextjs", version: "8.12.0" },
              environment: "development",
              browser: "Chrome 125.0.0",
              mocked: true
            }
          });
        });
      }

      // Adiciona um erro órfão adicional (sem trace_id) para diversificar a timeline
      mockIssues.push({
        id: "sentry-mock-orphan-1",
        source: 'sentry',
        title: "ReferenceError: activeTab is not defined",
        message: "ReferenceError: activeTab is not defined na linha 254 em components/dashboard.tsx",
        level: "error",
        trace_id: null,
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 min atrás
        metadata: {
          culprit: "components/dashboard.tsx:254",
          sentry_url: `https://sentry.io/organizations/${org}/issues/orphan-1/`,
          sdk: { name: "sentry.javascript.nextjs", version: "8.12.0" },
          environment: "production",
          mocked: true
        }
      });

      return mockIssues;

    } catch (e) {
      console.warn("⚠️ Sentry: Falha ao gerar mocks para desenvolvimento:", e);
      return [];
    }
  }
};
