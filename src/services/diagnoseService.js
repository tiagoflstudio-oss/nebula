import { supabase } from '../lib/supabaseClient';

export const diagnoseService = {
  /**
   * Obtém a primeira conexão de provedor de IA ativa que possui chaves configuradas.
   */
  async getActiveAIProvider() {
    try {
      const { data, error } = await supabase
        .from('provider_connections')
        .select('provider, credentials, is_active')
        .eq('is_active', true)
        .limit(5);

      if (error) throw error;
      
      // Filtra os que possuem credentials e api_key válida
      return data?.find(conn => conn.credentials && conn.credentials.api_key) || null;
    } catch (err) {
      console.error('Erro ao verificar conexões de provedores de IA:', err);
      return null;
    }
  },

  /**
   * Envia o contexto do incidente e eventos correlacionados para a LLM gerar o diagnóstico.
   */
  async generateDiagnosis(incident, correlatedLogs = []) {
    const providerConn = await this.getActiveAIProvider();
    
    // Constrói o Prompt de forma detalhada e contextualizada
    const prompt = this.buildPrompt(incident, correlatedLogs);

    if (providerConn) {
      const { provider, credentials } = providerConn;
      const apiKey = credentials.api_key;

      if (provider === 'google') {
        return this.callGeminiAPI(apiKey, prompt);
      } else if (provider === 'openai') {
        return this.callOpenAIAPI(apiKey, prompt);
      } else {
        console.warn(`Provedor '${provider}' não suportado diretamente para diagnósticos automáticos.`);
      }
    }

    // Fallback: Se houver uma chave de API do Gemini no ambiente .env
    const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envGeminiKey) {
      return this.callGeminiAPI(envGeminiKey, prompt);
    }

    // Se nenhuma conexão/chave estiver configurada, usa o Mock de Diagnóstico Inteligente
    return this.generateSimulatedDiagnosis(incident);
  },

  /**
   * Chamada direta para a API do Google Gemini
   */
  async callGeminiAPI(apiKey, prompt) {
    try {
      console.log('🤖 Enviando contexto de incidente para o Gemini...');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1500
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API do Gemini retornou status ${response.status}`);
      }

      const resJson = await response.json();
      return resJson.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao processar resposta do Gemini.";
    } catch (err) {
      console.error('Falha ao obter resposta do Gemini:', err);
      throw new Error(`Erro na API do Gemini: ${err.message}`);
    }
  },

  /**
   * Chamada direta para a API da OpenAI
   */
  async callOpenAIAPI(apiKey, prompt) {
    try {
      console.log('🤖 Enviando contexto de incidente para a OpenAI...');
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Você é um engenheiro de software especialista em observabilidade e SRE do projeto Confia.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API da OpenAI retornou status ${response.status}`);
      }

      const resJson = await response.json();
      return resJson.choices?.[0]?.message?.content || "Erro ao processar resposta da OpenAI.";
    } catch (err) {
      console.error('Falha ao obter resposta da OpenAI:', err);
      throw new Error(`Erro na API da OpenAI: ${err.message}`);
    }
  },

  /**
   * Constrói a mensagem/prompt com o contexto completo do incidente.
   */
  buildPrompt(incident, correlatedLogs) {
    const isSentry = incident.source === 'sentry';
    
    let prompt = `Você é um Engenheiro de Confiabilidade (SRE) do projeto **Confia** (SaaS Next.js + Supabase).
Analise o seguinte incidente de produção reportado e crie um relatório técnico com:
1. **Resumo do Incidente** (O que quebrou do ponto de vista do usuário/negócio)
2. **Causa Raiz Provável** (Detalhes técnicos do motivo da quebra)
3. **Solução Recomendada** (Instruções exatas e trecho de código para corrigir o problema no Confia)

---

### INCIDENTE REPORTADO:
- **Origem**: ${isSentry ? 'Erro Técnico (Sentry)' : 'Evento de Negócio (Nebula)'}
- **Serviço/Módulo**: ${incident.service || 'geral'}
- **Nível**: ${incident.level}
- **Timestamp**: ${incident.created_at}
- **Mensagem**: ${isSentry ? incident.title : incident.message}
${incident.tenant_name ? `- **Cliente Afetado**: ${incident.tenant_name} (${incident.tenant_id})` : ''}

### PAYLOAD DE METADADOS:
\`\`\`json
${JSON.stringify(incident.metadata || {}, null, 2)}
\`\`\`
`;

    if (correlatedLogs && correlatedLogs.length > 0) {
      prompt += `
### EVENTOS CORRELACIONADOS (Timeline com o mesmo Trace ID '${incident.trace_id}'):
Abaixo estão os eventos que ocorreram no mesmo fluxo de execução (antes e depois do erro):
`;
      correlatedLogs.forEach((log, idx) => {
        const sourceName = log.source === 'sentry' ? 'SENTRY' : `NEBULA [${log.service}]`;
        prompt += `${idx + 1}. [${log.created_at}] [${sourceName}] [${log.level.toUpperCase()}]: ${log.message || log.title}\n`;
      });
    }

    prompt += `\nResponda em Português do Brasil com formatação rica em Markdown. Seja prático, objetivo e forneça exemplos de código claros da solução.`;
    return prompt;
  },

  /**
   * Gerador de diagnósticos mockados inteligentes e realistas
   * para desenvolvimento imediato sem necessidade de setup de chaves de API.
   */
  generateSimulatedDiagnosis(incident) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isSentry = incident.source === 'sentry';
        const service = incident.service || 'geral';
        const messageText = isSentry ? incident.title : incident.message;

        let diagnosis = `### 🤖 Diagnóstico de Inteligência Artificial (Modo Simulação)

> **[Nota de SRE]**: Nenhuma chave de API (Gemini ou OpenAI) foi detectada ativa em suas conexões. Exibindo diagnóstico gerado localmente pelo motor do Nebula.

---

### 1. Resumo do Incidente
* **Impacto no Usuário**: Falha crítica na execução do fluxo do módulo **${service}**.
* **Tipo de Evento**: ${isSentry ? 'Erro Técnico capturado no Next.js (Sentry)' : 'Alerta de negócio disparado na Ingestão Nebula'}.
* **Mensagem da Ocorrência**: \`${messageText}\`
* **Timestamp**: \`${new Date(incident.created_at).toLocaleString()}\`

---

`;

        // Diagnósticos específicos para erros conhecidos de desenvolvimento
        if (messageText.includes('Asaas') || service === 'billing') {
          diagnosis += `### 2. Causa Raiz Provável
A chamada HTTP para a API de homologação/produção do gateway de pagamento **Asaas** estourou o tempo limite configurado de 10 segundos (Timeout 504).
Isso ocorre quando a API do Asaas apresenta lentidão intermitente no processamento de requisições de criação de assinaturas. A falta de uma política de retentativas automáticas no cliente HTTP faz com que o fluxo quebre no backend do Confia.

* **Arquivo afetado**: \`lib/actions/billing.ts\`
* **Linha provável**: 84 (chamada de \`fetch\` para o endpoint \`/subscriptions\`)

---

### 3. Solução Recomendada (Correção no Confia)

Implementar uma estratégia de retentativas exponenciais (*exponential backoff*) com limite de 3 tentativas usando uma função auxiliar no fetch de billing do Confia.

**Exemplo de Ajuste no Código (\`lib/actions/billing.ts\`):**

\`\`\`typescript
// Suba uma função utilitária de retentativas
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok && response.status >= 500 && retries > 0) {
      throw new Error(\`Server error: \${response.status}\`);
    }
    return response;
  } catch (error) {
    if (retries === 0) throw error;
    console.warn(\`⚠️ Asaas API falhou, tentando novamente em \${delay}ms...\`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

// Substitua na criação da assinatura:
const response = await fetchWithRetry(
  'https://sandbox.asaas.com/api/v3/subscriptions',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.ASAAS_API_KEY!
    },
    body: JSON.stringify(subscriptionData)
  }
);
\`\`\`
`;
        } else if (messageText.includes('Sefaz') || service === 'nfe') {
          diagnosis += `### 2. Causa Raiz Provável
A assinatura XML gerada para o lote de notas fiscais de serviço (NFSe) falhou na validação de esquema no webservice da prefeitura/Sefaz. Isso indica que a tag de certificado digital A1 está desatualizada no banco ou que a codificação de caracteres especiais nos dados da nota corrompeu a digestão do hash XML.

* **Arquivo afetado**: \`lib/actions/nfe-sender.ts\`
* **Linha provável**: 204

---

### 3. Solução Recomendada (Correção no Confia)

Sanitizar a mensagem e codificar o arquivo em UTF-8 removendo acentos do XML antes de submeter ao validador da Sefaz.

\`\`\`typescript
// Adicione um sanitizador de strings no envio de notas
export function sanitizeXmlString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "") // remove acentos
    .replace(/[&<>'"]/g, (c) => {
      switch (c) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        default: return '&apos;';
      }
    });
}
\`\`\`
`;
        } else if (messageText.includes('WebSocket') || service === 'pdv-sync') {
          diagnosis += `### 2. Causa Raiz Provável
O túnel de persistência em tempo real com o PDV local caiu devido a uma perda temporária de pacote na rede do cliente. A biblioteca de sockets nativa do navegador não iniciou a rotina de reconexão de forma automática, deixando o estado do sincronizador em limbo (*stale state*).

* **Arquivo afetado**: \`hooks/use-pdv-sync.ts\`
* **Linha provável**: 112

---

### 3. Solução Recomendada (Correção no Confia)

Implementar reconexão ativa com tratamento de erro no hook de sincronização do PDV:

\`\`\`typescript
// Ajuste no hook de WebSocket do PDV
const connectWS = () => {
  const ws = new WebSocket(url);
  
  ws.onclose = () => {
    console.log("WebSocket desconectado. Tentando reconectar em 5 segundos...");
    setTimeout(() => {
      connectWS();
    }, 5000);
  };
  
  ws.onerror = (err) => {
    console.error("Erro no WebSocket:", err);
    ws.close();
  };
};
\`\`\`
`;
        } else {
          // Diagnóstico genérico
          diagnosis += `### 2. Causa Raiz Provável
Ocorreu uma exceção não tratada na execução do microsserviço ou ação servidor Next.js. O payload de metadados indica que um parâmetro obrigatório veio nulo ou mal formatado na chamada, resultando em quebra de fluxo.

* **Arquivo afetado**: \`lib/actions/${service}.ts\`
* **Caminho da falha**: \`lib/actions/${service}.ts:108\`

---

### 3. Solução Recomendada (Correção no Confia)

Adicionar validação robusta de esquema usando a biblioteca **Zod** antes do início do fluxo de processamento da action:

\`\`\`typescript
import { z } from 'zod';

const actionInputSchema = z.object({
  tenantId: z.string().uuid(),
  payload: z.record(z.any()),
  timestamp: z.string().datetime()
});

export async function handleAction(input: any) {
  const parsed = actionInputSchema.safeParse(input);
  if (!parsed.success) {
    console.error("Erro de validação de input:", parsed.error);
    throw new Error("Input de requisição inválido.");
  }
  
  // Prosseguir com dados validados de forma segura
  const { tenantId, payload } = parsed.data;
}
\`\`\`
`;
        }

        resolve(diagnosis);
      }, 1500); // delay de 1.5s simulando processamento da IA
    });
  }
};
