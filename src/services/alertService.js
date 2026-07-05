import { supabase } from '../lib/supabaseClient';

export const alertService = {
  /**
   * Retorna todas as regras de alerta de um projeto.
   */
  async getAlertRules(projectId) {
    try {
      let query = supabase
        .from('alert_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar regras de alerta:', err);
      throw err;
    }
  },

  /**
   * Cria uma nova regra de alerta.
   */
  async createAlertRule(ruleData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await supabase
        .from('alert_rules')
        .insert([{ ...ruleData, user_id: user.id }])
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao criar regra de alerta:', err);
      throw err;
    }
  },

  /**
   * Atualiza uma regra de alerta existente (inclui toggle is_active).
   */
  async updateAlertRule(ruleId, updates) {
    try {
      const { data, error } = await supabase
        .from('alert_rules')
        .update(updates)
        .eq('id', ruleId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao atualizar regra de alerta:', err);
      throw err;
    }
  },

  /**
   * Toggle rápido ativo/inativo.
   */
  async toggleAlertRule(ruleId, currentState) {
    return this.updateAlertRule(ruleId, { is_active: !currentState });
  },

  /**
   * Deleta uma regra de alerta.
   */
  async deleteAlertRule(ruleId) {
    try {
      const { error } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Erro ao deletar regra de alerta:', err);
      throw err;
    }
  },

  /**
   * Retorna o histórico de alertas disparados, com JOIN à regra correspondente.
   */
  async getAlertHistory(projectId, limit = 50) {
    try {
      let query = supabase
        .from('alert_history')
        .select(`
          *,
          rule:alert_rules(name, channel, filter_level, filter_service)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar histórico de alertas:', err);
      throw err;
    }
  }
};
