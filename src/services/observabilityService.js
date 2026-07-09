import { supabase } from '../lib/supabaseClient';

export const observabilityService = {
  /**
   * Busca logs de eventos com filtros
   */
  async getEvents(filters = {}) {
    const { projectId, service, level, tenant_id, search, dateRange } = filters;
    
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Se projectId for definido e diferente de 'all', filtra por ele
    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    if (service && service !== 'sentry') {
      query = query.eq('service', service);
    }

    if (level) {
      query = query.eq('level', level);
    }

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }

    if (search) {
      query = query.ilike('message', `%${search}%`);
    }

    if (dateRange) {
      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Erro ao buscar eventos no Supabase:', error);
      throw error;
    }

    return { data: data || [], count };
  },

  /**
   * Busca eventos relacionados por trace_id para correlação
   */
  async getEventsByTraceId(traceId) {
    if (!traceId) return [];
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('trace_id', traceId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`Erro ao buscar eventos do trace ${traceId}:`, error);
      throw error;
    }

    return data || [];
  },

  /**
   * Coleta métricas de resumo das últimas 24 horas para os cards do topo
   */
  async getSummaryStats(projectId = null) {
    try {
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // 1. Total de eventos em 24h
      let totalQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', past24h);

      if (projectId && projectId !== 'all') {
        totalQuery = totalQuery.eq('project_id', projectId);
      }

      const { count: total24h, error: errTotal } = await totalQuery;
      if (errTotal) throw errTotal;

      // 2. Erros e Críticos em 24h
      let errorsQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .in('level', ['error', 'critical'])
        .gte('created_at', past24h);

      if (projectId && projectId !== 'all') {
        errorsQuery = errorsQuery.eq('project_id', projectId);
      }

      const { count: errors24h, error: errErrors } = await errorsQuery;
      if (errErrors) throw errErrors;

      // 3. Top serviços com erros (obtidos agregando os erros das últimas 24h)
      let recentErrorsQuery = supabase
        .from('audit_logs')
        .select('service')
        .in('level', ['error', 'critical'])
        .gte('created_at', past24h);

      if (projectId && projectId !== 'all') {
        recentErrorsQuery = recentErrorsQuery.eq('project_id', projectId);
      }

      const { data: recentErrors, error: errRecent } = await recentErrorsQuery;
      if (errRecent) throw errRecent;

      const serviceErrorCounts = {};
      if (recentErrors) {
        recentErrors.forEach(log => {
          if (log.service) {
            serviceErrorCounts[log.service] = (serviceErrorCounts[log.service] || 0) + 1;
          }
        });
      }

      const topServices = Object.entries(serviceErrorCounts)
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return {
        total24h: total24h || 0,
        errors24h: errors24h || 0,
        topServices
      };
    } catch (err) {
      console.error('Erro ao buscar estatísticas de observabilidade:', err);
      return {
        total24h: 0,
        errors24h: 0,
        topServices: []
      };
    }
  },

  /**
   * Assina o canal de eventos em tempo real do Supabase
   */
  subscribeToEvents(callback, projectId = null) {
    let filterPattern = undefined;
    if (projectId && projectId !== 'all') {
      filterPattern = `project_id=eq.${projectId}`;
    }

    const subscription = supabase
      .channel('observability_events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: filterPattern },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  /**
   * Calcula o score de integridade (0-100%) por tenant nas últimas 24h
   */
  async getTenantHealthScores(projectId = null) {
    try {
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let query = supabase
        .from('audit_logs')
        .select('tenant_id, tenant_name, level')
        .gte('created_at', past24h)
        .not('tenant_id', 'is', null);

      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tenantsMap = {};
      data.forEach(log => {
        const id = log.tenant_id;
        const name = log.tenant_name || id;
        const isError = ['error', 'critical'].includes(log.level);

        if (!tenantsMap[id]) {
          tenantsMap[id] = { id, name, total: 0, errors: 0 };
        }
        if (log.tenant_name && log.tenant_name !== id) {
          tenantsMap[id].name = log.tenant_name;
        }

        tenantsMap[id].total += 1;
        if (isError) {
          tenantsMap[id].errors += 1;
        }
      });

      return Object.values(tenantsMap).map(t => {
        const successCount = t.total - t.errors;
        const score = t.total > 0 ? Math.round((successCount / t.total) * 100) : 100;
        return {
          tenant_id: t.id,
          tenant_name: t.name,
          total_events: t.total,
          error_events: t.errors,
          health_score: score
        };
      }).sort((a, b) => a.health_score - b.health_score);
    } catch (err) {
      console.error('Erro ao buscar score de saúde dos tenants:', err);
      throw err;
    }
  },

  /**
   * Obtém o status dos heartbeats de serviços dos tenants
   */
  async getServiceHeartbeats(projectId = null) {
    try {
      let query = supabase
        .from('service_heartbeats')
        .select('*');

      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query.order('last_seen', { ascending: false });
      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Erro ao buscar heartbeats de serviços:', err);
      throw err;
    }
  }
};

