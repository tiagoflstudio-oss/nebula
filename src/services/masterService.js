import { supabase } from '../lib/supabaseClient';

export const masterService = {
  // Obter estatísticas globais para o Dashboard Master
  async getGlobalStats() {
    try {
      // 1. Conexões Ativas
      const { count: activeConnections } = await supabase
        .from('provider_connections')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 2. Clientes Master (Total de usuários)
      // Nota: Em um ambiente real, poderíamos ter uma tabela de 'clients' específica.
      // Por enquanto, vamos retornar um valor base ou tentar contar perfis se houver uma tabela de profiles.
      const { count: clientCount } = await supabase
        .from('user_quotas')
        .select('*', { count: 'exact', head: true });

      // 3. Uso de Tokens nas últimas 24h
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      
      const { data: usageData } = await supabase
        .from('usage_logs')
        .select('total_tokens')
        .gt('created_at', yesterday.toISOString());

      const totalTokens24h = usageData?.reduce((acc, curr) => acc + curr.total_tokens, 0) || 0;

      return {
        activeConnections: activeConnections || 0,
        clientCount: clientCount || 0,
        totalTokens24h,
        performance: '100%' // Simulado por enquanto
      };
    } catch (err) {
      console.error('Erro ao buscar estatísticas master:', err);
      return null;
    }
  },

  // Obter status real dos provedores
  async getProvidersStatus() {
    try {
      const { data } = await supabase
        .from('provider_connections')
        .select('provider, is_active, models');

      const providers = [
        { id: 'openai', name: 'OpenAI', status: 'offline', models: [] },
        { id: 'anthropic', name: 'Anthropic', status: 'offline', models: [] },
        { id: 'google', name: 'Google Gemini', status: 'offline', models: [] },
        { id: 'openrouter', name: 'OpenRouter', status: 'offline', models: [] },
      ];

      data?.forEach(conn => {
        const p = providers.find(item => item.id === conn.provider);
        if (p && conn.is_active) {
          p.status = 'online';
          p.models = conn.models || [];
        }
      });

      return providers;
    } catch (err) {
      console.error('Erro ao buscar status dos provedores:', err);
      return [];
    }
  },

  // Obter atividade recente (Mesclando uso de tokens e auditoria do PicoClaw)
  async getRecentActivity() {
    try {
      const [usageRes, auditRes] = await Promise.all([
        supabase
          .from('usage_logs')
          .select('id, provider, model, total_tokens, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('audit_logs')
          .select('id, action_type, message, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const activities = [];

      // Adiciona logs de uso
      usageRes.data?.forEach(log => {
        activities.push({
          id: `usage-${log.id}`,
          message: `IA: ${log.provider.toUpperCase()} (${log.model}) - ${log.total_tokens} tokens`,
          timestamp: log.created_at,
          type: 'usage'
        });
      });

      // Adiciona logs de auditoria (PicoClaw)
      auditRes.data?.forEach(log => {
        activities.push({
          id: `audit-${log.id}`,
          message: `CORE: ${log.message}`,
          timestamp: log.created_at,
          type: log.status === 'error' ? 'error' : 'security'
        });
      });

      // Ordena por data e retorna os 8 mais recentes
      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 8);
        
    } catch (err) {
      console.error('Erro ao buscar atividade recente:', err);
      return [];
    }
  },

  // Listar todos os usuários e suas cotas
  async getClients() {
    try {
      const { data, error } = await supabase
        .from('user_quotas')
        .select(`
          user_id,
          total_limit,
          used_tokens,
          last_reset
        `);
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      return [];
    }
  },

  // Atualizar o limite de um usuário
  async updateUserQuota(userId, newLimit) {
    try {
      const { error } = await supabase
        .from('user_quotas')
        .update({ total_limit: newLimit })
        .eq('user_id', userId);
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Erro ao atualizar quota:', err);
      return { success: false, error: err.message };
    }
  },

  // Salvar ou atualizar conexão de provedor
  async saveProviderConnection(userId, provider, token, models = []) {
    try {
      if (!userId) throw new Error("userId é obrigatório");

      // Nota: No nível Master, as chaves de API devem ser tratadas com cuidado.
      // Aqui estamos salvando na tabela pública provider_connections.
      const { data: existing } = await supabase
        .from('provider_connections')
        .select('id')
        .eq('provider', provider)
        .single();

      if (existing) {
        await supabase
          .from('provider_connections')
          .update({ 
            credentials: { api_key: token },
            models,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('provider_connections')
          .insert({
            user_id: userId,
            provider,
            credentials: { api_key: token },
            models,
            is_active: true
          });

      }
      return { success: true };
    } catch (err) {
      console.error('Erro ao salvar conexão:', err);
      return { success: false, error: err.message };
    }
  }
};
