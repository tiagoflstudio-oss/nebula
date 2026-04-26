/**
 * Quota Service - Fetch usage data from provider APIs
 * Adapted from 9Router/open-sse
 */

const ANTIGRAVITY_CONFIG = {
  quotaApiUrl: "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels",
  loadProjectApiUrl: "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist",
  userAgent: "antigravity/0.0.1",
};

import { refreshProviderToken } from './oauthService';

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
      const newToken = await refreshProviderToken(id);
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
  // 1. Get Project ID / Subscription Info
  let projectId = null;
  let planName = "Premium";

  try {
    const subRes = await fetch(ANTIGRAVITY_CONFIG.loadProjectApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": ANTIGRAVITY_CONFIG.userAgent
      },
      body: JSON.stringify({ mode: 1 }),
    });
    
    if (subRes.ok) {
      const subInfo = await subRes.json();
      console.log("📦 Resposta loadCodeAssist (mode 1):", subInfo);
      
      let rawId = subInfo?.cloudaicompanionProject || subInfo?.project;
      
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
    console.warn("⚠️ Não foi possível carregar info do projeto Antigravity, tentando sem ID.");
  }

  // 2. Fetch Quotas
  const cleanProjectId = projectId?.replace('projects/', '');

  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": ANTIGRAVITY_CONFIG.userAgent,
    "X-Goog-Api-Client": "gl-js/ auth/2.0.0 grpc/1.53.0",
    "x-goog-user-project": cleanProjectId
  };

  console.log("📤 Enviando requisição de cota Antigravity (Modo Bypass)...", {
    url: ANTIGRAVITY_CONFIG.quotaApiUrl,
    project: cleanProjectId
  });

  const response = await fetch(ANTIGRAVITY_CONFIG.quotaApiUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({}),
  });

  if (!response.ok) throw new Error(`Erro Antigravity: ${response.status}`);
  const data = await response.json();
  const quotas = [];

  // Mapeamento flexível por palavras-chave
  const modelMappings = [
    { key: 'gemini-3.1-pro-high', name: 'Gemini 3.1 Pro (High)', search: 'gemini-3.1-pro' },
    { key: 'gemini-3.1-pro-low', name: 'Gemini 3.1 Pro (Low)', search: 'gemini-3.1-pro-low' },
    { key: 'gemini-3-flash', name: 'Gemini 3 Flash', search: 'gemini-3-flash' },
    { key: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', search: 'sonnet' },
    { key: 'claude-opus-4-6', name: 'Claude Opus 4.6', search: 'opus' },
    { key: 'gpt-oss-120b', name: 'GPT-OSS 120B', search: 'gpt-oss' },
  ];

  if (data.models) {
    // Primeiro tenta match exato
    for (const mapping of modelMappings) {
      const modelKey = Object.keys(data.models).find(k => k.includes(mapping.search));
      if (modelKey) {
        const info = data.models[modelKey];
        if (info.quotaInfo) {
          const fraction = info.quotaInfo.remainingFraction !== undefined ? info.quotaInfo.remainingFraction : 1.0;
          const total = 1000; // Normalizando para base 1000
          const remaining = Math.round(total * fraction);
          
          quotas.push({
            name: mapping.name,
            used: total - remaining,
            total,
            resetAt: info.quotaInfo.resetTime,
            percentage: Math.round(fraction * 100)
          });
        }
      }
    }
  }

  // Fallback se não encontrou os modelos específicos mas a API retornou algo
  if (quotas.length === 0 && data.models) {
    console.log("🔍 Detectando modelos via fallback...");
    Object.entries(data.models).slice(0, 6).forEach(([key, info]) => {
      if (info.quotaInfo) {
        quotas.push({
          name: key.split('/').pop(),
          used: 100 - Math.round((info.quotaInfo.remainingFraction || 0) * 100),
          total: 100,
          resetAt: info.quotaInfo.resetTime
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
