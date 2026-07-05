import { supabase } from '../lib/supabaseClient';

export const projectService = {
  /**
   * Obtém todos os projetos que o usuário autenticado tem permissão para visualizar.
   */
  async getProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao listar projetos:', err);
      throw err;
    }
  },

  /**
   * Cria um novo projeto monitorado.
   * O banco de dados gera automaticamente a ingest_secret de forma aleatória e segura.
   */
  async createProject(name, slug, options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const projectPayload = {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-_]/g, ''), // sanitiza o slug
        user_id: user.id,
        github_repo_url: options.github_repo_url || null,
        uptime_url: options.uptime_url || null,
        sentry_org: options.sentry_org || null,
        sentry_project: options.sentry_project || null
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([projectPayload])
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao cadastrar projeto:', err);
      throw err;
    }
  },

  /**
   * Atualiza as configurações e integrações de um projeto existente.
   */
  async updateProject(projectId, dataToUpdate) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: dataToUpdate.name,
          github_repo_url: dataToUpdate.github_repo_url || null,
          uptime_url: dataToUpdate.uptime_url || null,
          sentry_org: dataToUpdate.sentry_org || null,
          sentry_project: dataToUpdate.sentry_project || null
        })
        .eq('id', projectId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`Erro ao atualizar projeto ${projectId}:`, err);
      throw err;
    }
  },

  /**
   * Exclui um projeto monitorado e remove seus logs associados em cascata.
   */
  async deleteProject(projectId) {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error(`Erro ao deletar projeto ${projectId}:`, err);
      throw err;
    }
  }
};
