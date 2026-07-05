import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const MasterOS = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Erro ao buscar perfis:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      fetchProfiles(); // Atualiza a lista
    } catch (error) {
      console.error('Erro ao atualizar cargo:', error.message);
    }
  };

  if (loading) return <div className="loading-os">Carregando Master OS...</div>;

  return (
    <div className="master-os-container fade-in">
      <header className="os-header">
        <h4>Gerenciamento de Tenants</h4>
        <span className="user-count">{profiles.length} usuários</span>
      </header>

      <div className="user-list">
        {profiles.map(profile => (
          <div key={profile.id} className="user-card glass">
            <div className="user-info">
              <span className="user-name">{profile.full_name || 'Usuário Sem Nome'}</span>
              <span className="user-role-badge" data-role={profile.role}>{profile.role}</span>
            </div>
            
            <div className="user-actions">
              <select 
                value={profile.role} 
                onChange={(e) => updateRole(profile.id, e.target.value)}
                className="role-select"
              >
                <option value="user">Usuário Comum</option>
                <option value="vip">VIP (Sócio)</option>
                <option value="admin">Administrador</option>
                <option value="moderator">Moderador</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasterOS;
