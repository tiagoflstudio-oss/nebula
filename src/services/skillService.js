import { supabase } from '../lib/supabaseClient';

export const skillService = {
  // Obter todas as habilidades cadastradas
  async getSkills() {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar skills:', err);
      return [];
    }
  },

  // Criar uma nova habilidade
  async createSkill(skill) {
    try {
      const { data, error } = await supabase
        .from('skills')
        .insert([skill])
        .select();
      
      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (err) {
      console.error('Erro ao criar skill:', err);
      return { success: false, error: err.message };
    }
  },

  // Deletar uma habilidade
  async deleteSkill(id) {
    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Erro ao deletar skill:', err);
      return { success: false, error: err.message };
    }
  }
};
