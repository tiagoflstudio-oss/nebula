import { supabase } from '../lib/supabaseClient';

export const observabilityService = {
  /**
   * Busca logs de eventos com filtros
   */
  async getEvents(filters = {}) {
    const { service, level, tenant_id, search, dateRange } = filters;
    
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Restringir ao Confia
    query = query.eq('source_project', 'confia');

    if (service) {
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
  async getSummaryStats() {
    try {
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // 1. Total de eventos em 24h
      const { count: total24h, error: errTotal } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('source_project', 'confia')
        .gte('created_at', past24h);

      if (errTotal) throw errTotal;

      // 2. Erros e Críticos em 24h
      const { count: errors24h, error: errErrors } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('source_project', 'confia')
        .in('level', ['error', 'critical'])
        .gte('created_at', past24h);

      if (errErrors) throw errErrors;

      // 3. Top serviços com erros (obtidos agregando os erros das últimas 24h)
      const { data: recentErrors, error: errRecent } = await supabase
        .from('audit_logs')
        .select('service')
        .eq('source_project', 'confia')
        .in('level', ['error', 'critical'])
        .gte('created_at', past24h);

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
  subscribeToEvents(callback) {
    const subscription = supabase
      .channel('observability_events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: 'source_project=eq.confia' },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
};
