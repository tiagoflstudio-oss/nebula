/**
 * OAuth Service - Handle connections and token refreshing
 * Inspired by 9Router logic
 */
import { supabase } from '../lib/supabaseClient';

const OAUTH_CONFIGS = {
  antigravity: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
    clientSecret: "",
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/cclog",
      "https://www.googleapis.com/auth/experimentsandconfigs",
      "openid"
    ],
  },
  gemini: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com",
    clientSecret: "",
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
  },
  github: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "user:email"],
  },
  claude: {
    authorizeUrl: "https://api.anthropic.com/api/oauth/authorize",
    tokenUrl: "https://api.anthropic.com/api/oauth/token",
    scopes: ["usage:read"],
  }
};

/**
 * Build the authorization URL for a provider
 */
export function buildAuthUrl(provider, clientId, redirectUri, state) {
  const config = OAUTH_CONFIGS[provider];
  if (!config) throw new Error(`Configuração não encontrada para ${provider}`);

  // Use provider's default clientId if not provided
  const finalClientId = clientId || config.clientId;
  if (!finalClientId) throw new Error(`Client ID não configurado para ${provider}`);

  const params = new URLSearchParams({
    client_id: finalClientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: config.scopes.join(" "),
    state: state,
    access_type: "offline", // Essential for refresh token
    prompt: "consent",
  });

  return `${config.authorizeUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(provider, code, clientId, clientSecret, redirectUri) {
  const config = OAUTH_CONFIGS[provider];
  
  const finalClientId = clientId || config.clientId;
  const finalClientSecret = clientSecret || config.clientSecret;

  if (!finalClientId) throw new Error(`Client ID não configurado para ${provider}`);

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: finalClientId,
    code: code,
    redirect_uri: redirectUri,
  });

  if (finalClientSecret && finalClientSecret !== "PLACEHOLDER_SECRET") {
    params.append("client_secret", finalClientSecret);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Troca de token falhou: ${error}`);
  }

  return await response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshProviderToken(connectionId) {
  // 1. Get connection from Supabase
  const { data: conn, error: fetchError } = await supabase
    .from('provider_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (fetchError || !conn.refresh_token) return null;

  const config = OAUTH_CONFIGS[conn.provider];
  if (!config) return null;

  try {
    // Note: We need clientId/clientSecret here. 
    // In a production app, these should be handled by an Edge Function for security.
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: conn.refresh_token,
        client_id: conn.settings?.client_id || "", 
        client_secret: conn.settings?.client_secret || "",
      }),
    });

    if (!response.ok) throw new Error("Refresh failed");
    
    const tokens = await response.json();

    // 2. Update Supabase
    const { error: updateError } = await supabase
      .from('provider_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || conn.refresh_token,
        expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (updateError) throw updateError;

    return tokens.access_token;
  } catch (err) {
    console.error(`Erro ao renovar token de ${conn.provider}:`, err);
    return null;
  }
}
