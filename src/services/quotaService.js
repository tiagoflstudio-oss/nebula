/**
 * Quota Service - Fetch usage data from provider APIs
 * Adapted from 9Router/open-sse
 */

import { refreshProviderToken } from './oauthService';
import { supabase } from '../lib/supabaseClient';

/**
 * Get usage data for a provider connection
 */
export async function getUsageForProvider(connection) {
  const { id, provider, expires_at } = connection;
  let accessToken = connection.access_token;

  // 1. Check if token is expired and refresh if necessary
  if (expires_at && new Date(expires_at) < new Date()) {
    console.log(`🔄 Token de ${provider} expirado. Tentando renovar...`);
    const newToken = await refreshProviderToken(id);
    if (newToken) {
      accessToken = newToken;
    } else {
      return { error: "Token expirado e falha ao renovar. Por favor, reconecte sua conta." };
    }
  }

  try {
    let result;
    switch (provider) {
      case "github":
        result = await getGitHubUsage(accessToken);
        break;
      case "antigravity":
        result = await getAntigravityUsage(accessToken);
        break;
      case "claude":
        result = await getClaudeUsage(accessToken);
        break;
      case "codex":
        result = await getCodexUsage(accessToken);
        break;
      default:
        return { message: `API de cota não implementada para ${provider}` };
    }
    return result;
  } catch (error) {
    // 2. Retry once if 401 Unauthorized
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log(`⚠️ Erro 401 em ${provider}. Tentando refresh forçado...`);
      
      let newToken = null;

      // Especial Antigravity: tentar obter do host gcloud CLI
      if (provider === "antigravity") {
        try {
          console.log("🔄 Tentando gerar novo token ADC via host CLI para Antigravity...");
          const adcRes = await fetch('/api/antigravity/refresh-local-token', { method: 'POST' });
          if (adcRes.ok) {
            const data = await adcRes.json();
            if (data.access_token) {
              newToken = data.access_token;
              // Salvar no Supabase silenciosamente para estabilidade futura
              await supabase
                .from('provider_connections')
                .update({ 
                  access_token: newToken,
                  expires_at: new Date(Date.now() + 3500000).toISOString(), // 58 minutos
                  updated_at: new Date().toISOString()
                })
                .eq('id', id);
            }
          }
        } catch (e) {
          console.warn("Falha ao recuperar token ADC:", e);
        }
      }

      if (!newToken) {
        newToken = await refreshProviderToken(id);
      }

      if (newToken) {
        try {
          switch (provider) {
            case "github": return await getGitHubUsage(newToken);
            case "antigravity": return await getAntigravityUsage(newToken);
            case "claude": return await getClaudeUsage(newToken);
            case "codex": return await getCodexUsage(newToken);
          }
        } catch (retryError) {
          return { error: retryError.message };
        }
      }
    }
    console.error(`Erro ao buscar cota para ${provider}:`, error);
    return { error: error.message };
  }
}

/**
 * GitHub Copilot Usage
 */
async function getGitHubUsage(accessToken) {
  const response = await fetch("https://api.github.com/copilot_internal/user", {
    headers: {
      "Authorization": `token ${accessToken}`,
      "Accept": "application/json",
      "User-Agent": "GitHubCopilotChat/0.26.7",
    },
  });

  if (!response.ok) throw new Error(`Erro GitHub: ${response.status}`);
  const data = await response.json();

  const quotas = [];
  if (data.quota_snapshots) {
    const snapshots = data.quota_snapshots;
    const resetAt = data.quota_reset_date;
    
    if (snapshots.chat) quotas.push(formatGitHubQuota("Chat", snapshots.chat, resetAt));
    if (snapshots.completions) quotas.push(formatGitHubQuota("Completions", snapshots.completions, resetAt));
  } else if (data.limited_user_quotas) {
    const used = data.limited_user_quotas;
    const total = data.monthly_quotas || {};
    const resetAt = data.limited_user_reset_date;
    
    quotas.push({ name: "Chat", used: used.chat || 0, total: total.chat || 0, resetAt });
    quotas.push({ name: "Completions", used: used.completions || 0, total: total.completions || 0, resetAt });
  }

  return { plan: data.copilot_plan, quotas };
}

function formatGitHubQuota(name, quota, resetAt) {
  return {
    name,
    used: quota.entitlement - quota.remaining,
    total: quota.entitlement,
    resetAt
  };
}

/**
 * Antigravity Usage
 */
async function getAntigravityUsage(accessToken) {
  let projectId = null;
  let planName = "Premium";

  // 1. Get Project ID / Subscription Info via Proxy
  try {
    const subRes = await fetch('/api/antigravity', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'loadProject' })
    });
    
    if (subRes.ok) {
      const subInfo = await subRes.json();
      console.log("📦 Resposta loadCodeAssist via Proxy:", subInfo);
      
      let rawId = subInfo?.cloudaicompanionProject || subInfo?.project || subInfo?.project_id || subInfo?.projectId;

      // Tentar pegar do allowedTiers se o principal falhar ou for suspeito
      if (!rawId && subInfo.allowedTiers && subInfo.allowedTiers.length > 0) {
        rawId = subInfo.allowedTiers[0].project;
        console.log("🎟️ Usando Project ID do Allowed Tiers:", rawId);
      }
      if (rawId) {
        projectId = rawId.startsWith('projects/') ? rawId : `projects/${rawId}`;
        console.log("🎯 Antigravity Project ID detectado:", projectId);
      }
      planName = subInfo?.currentTier?.name || "Premium";
    }
  } catch (e) {
    console.warn("⚠️ Não foi possível carregar info do projeto Antigravity via Proxy.", e);
  }

  // 2. Fetch Quotas via Proxy
  console.log("📤 Enviando requisição de cota Antigravity via Proxy...");

  const response = await fetch('/api/antigravity', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'fetchQuota', projectId })
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("401 Unauthorized");
    throw new Error(`Erro Proxy Antigravity: ${response.status}`);
  }
  
  const data = await response.json();
  const quotas = [];

  // Mapeamento flexível por palavras-chave
  const modelMappings = [
    { name: 'Gemini 2.5 Pro', search: 'gemini-2.5-pro' },
    { name: 'Gemini 2.0 Flash', search: 'gemini-2.0-flash' },
    { name: 'Gemini 1.5 Pro', search: 'gemini-1.5-pro' },
    { name: 'Claude 3.7 Sonnet', search: 'sonnet' },
    { name: 'Claude 3 Opus', search: 'opus' },
    { name: 'Llama 3.3', search: 'llama' },
  ];

  if (data.models) {
    // Processar todos os modelos até o limite de 8
    Object.entries(data.models).slice(0, 8).forEach(([key, info]) => {
      if (info.quotaInfo) {
        // Encontrar um nome amigável ou usar a chave final
        const mapping = modelMappings.find(m => key.toLowerCase().includes(m.search));
        let friendlyName = mapping ? mapping.name : key.split('/').pop();
        
        // Capitalizar nome de fallback
        if (!mapping) friendlyName = friendlyName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Se remainingFraction for undefined, geralmente significa "cota ilimitada/enterprise"
        const isUnlimited = info.quotaInfo.remainingFraction === undefined;
        const fraction = isUnlimited ? 1.0 : info.quotaInfo.remainingFraction;
        const used = Math.round((1 - fraction) * 100);
        
        quotas.push({
          name: friendlyName,
          used: isUnlimited ? 0 : used,
          total: 100,
          resetAt: info.quotaInfo.resetTime,
          isUnlimited
        });
      }
    });
  }

  return { plan: planName, quotas };
}

/**
 * Codex (OpenAI) Usage
 */
async function getCodexUsage(accessToken) {
  const response = await fetch("https://chatgpt.com/backend-api/wham/usage", {
    headers: { "Authorization": `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error(`Erro Codex: ${response.status}`);
  const data = await response.json();
  const rl = data.rate_limit || {};

  return {
    plan: data.plan_type,
    quotas: [
      {
        name: "Session",
        used: rl.primary_window?.used_percent || 0,
        total: 100,
        resetAt: rl.primary_window?.reset_at ? new Date(rl.primary_window.reset_at * 1000).toISOString() : null
      },
      {
        name: "Weekly",
        used: rl.secondary_window?.used_percent || 0,
        total: 100,
        resetAt: rl.secondary_window?.reset_at ? new Date(rl.secondary_window.reset_at * 1000).toISOString() : null
      }
    ]
  };
}

/**
 * Claude Usage (OAuth)
 */
async function getClaudeUsage(accessToken) {
  const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "anthropic-beta": "oauth-2025-04-20",
      "anthropic-version": "2023-06-01",
    },
  });

  if (!response.ok) throw new Error(`Erro Claude: ${response.status}`);
  const data = await response.json();
  const quotas = [];

  const formatClaude = (label, window) => ({
    name: label,
    used: window.utilization,
    total: 100,
    resetAt: window.resets_at
  });

  if (data.five_hour) quotas.push(formatClaude("Session (5h)", data.five_hour));
  if (data.seven_day) quotas.push(formatClaude("Weekly (7d)", data.seven_day));

  return { plan: "Claude Code", quotas };
}
