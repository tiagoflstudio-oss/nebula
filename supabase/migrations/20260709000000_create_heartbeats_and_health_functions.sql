-- Migration: Monitoramento de Heartbeats e Detecção de Inatividade (Módulo 1)
-- Criado em: 2026-07-09
-- ============================================================

-- ============================================================
-- 1. Criar Tabela de Heartbeats de Serviços
-- ============================================================
CREATE TABLE IF NOT EXISTS service_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  service TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  tenant_name TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  timeout_minutes INTEGER DEFAULT 30 NOT NULL,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  -- Garante registro único por projeto, serviço e tenant
  CONSTRAINT unique_project_service_tenant UNIQUE (project_id, service, tenant_id)
);

-- ============================================================
-- 2. Habilitar RLS (Row Level Security)
-- ============================================================
ALTER TABLE service_heartbeats ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Políticas RLS
-- ============================================================
-- Limpar políticas existentes se existirem
DROP POLICY IF EXISTS "service_heartbeats: dono ou admin pode visualizar" ON service_heartbeats;
DROP POLICY IF EXISTS "service_heartbeats: service_role ou admin pode gerenciar" ON service_heartbeats;

-- Permitir leitura se o usuário for proprietário do projeto associado ou administrador
CREATE POLICY "service_heartbeats: dono ou admin pode visualizar" ON service_heartbeats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = service_heartbeats.project_id
      AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'vip')
    )
  );

-- Permitir inserção/atualização/deletar apenas para o proprietário do projeto ou administrador (usuário autenticado)
CREATE POLICY "service_heartbeats: dono ou admin pode gerenciar" ON service_heartbeats
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = service_heartbeats.project_id
      AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 4. Função e Trigger para Atualização Automática de Heartbeats
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_heartbeat_on_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Só processa se houver projeto, tenant e serviço válidos (e não for erro de mock/sentry geral)
  IF NEW.project_id IS NOT NULL 
     AND NEW.tenant_id IS NOT NULL 
     AND NEW.service IS NOT NULL 
     AND NEW.service <> 'sentry' 
  THEN
    INSERT INTO service_heartbeats (
      project_id,
      service,
      tenant_id,
      tenant_name,
      last_seen,
      status,
      updated_at
    )
    VALUES (
      NEW.project_id,
      NEW.service,
      NEW.tenant_id,
      COALESCE(NEW.tenant_name, NEW.tenant_id),
      NEW.created_at,
      'online',
      now()
    )
    ON CONFLICT (project_id, service, tenant_id) 
    DO UPDATE SET
      last_seen = EXCLUDED.last_seen,
      tenant_name = COALESCE(EXCLUDED.tenant_name, service_heartbeats.tenant_name),
      status = 'online',
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparada após novos inserts em audit_logs
DROP TRIGGER IF EXISTS trg_update_heartbeat_on_audit_log ON audit_logs;
CREATE TRIGGER trg_update_heartbeat_on_audit_log
  AFTER INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_heartbeat_on_audit_log();

-- ============================================================
-- 5. Procedure para Varredura de Timeouts e Alertas Reativos
-- ============================================================
CREATE OR REPLACE FUNCTION check_service_heartbeats()
RETURNS JSONB AS $$
DECLARE
  expired_rec RECORD;
  logs_created JSONB := '[]'::jsonb;
  inserted_log RECORD;
BEGIN
  -- Cursor para buscar heartbeats online que estouraram o timeout
  FOR expired_rec IN
    SELECT 
      h.id, 
      h.project_id, 
      h.service, 
      h.tenant_id, 
      h.tenant_name, 
      h.last_seen, 
      h.timeout_minutes, 
      p.user_id as project_owner, 
      p.slug as project_slug
    FROM service_heartbeats h
    JOIN projects p ON p.id = h.project_id
    WHERE h.status = 'online'
      AND h.last_seen + (h.timeout_minutes * INTERVAL '1 minute') < now()
  LOOP
    -- 1. Marcar o status do heartbeat como offline
    UPDATE service_heartbeats
    SET status = 'offline', updated_at = now()
    WHERE id = expired_rec.id;

    -- 2. Inserir log crítico na tabela audit_logs (o que acionará o process-alert)
    INSERT INTO audit_logs (
      project_id,
      user_id,
      source_project,
      service,
      level,
      message,
      metadata,
      trace_id,
      tenant_id,
      tenant_name,
      action_type
    ) VALUES (
      expired_rec.project_id,
      expired_rec.project_owner,
      expired_rec.project_slug,
      expired_rec.service,
      'critical',
      '⚠️ Serviço inativo: silêncio de heartbeat detectado por mais de ' || expired_rec.timeout_minutes || ' minutos.',
      jsonb_build_object(
        'event', 'heartbeat_timeout',
        'last_seen', expired_rec.last_seen,
        'timeout_minutes', expired_rec.timeout_minutes,
        'service', expired_rec.service
      ),
      'heartbeat-' || expired_rec.id || '-' || to_char(now(), 'YYYYMMDDHH24MISS'),
      expired_rec.tenant_id,
      expired_rec.tenant_name,
      'observability:heartbeat:timeout'
    ) RETURNING * INTO inserted_log;

    -- 3. Acumular o log gerado no array de retorno
    logs_created := logs_created || jsonb_build_array(jsonb_build_object(
      'id', inserted_log.id,
      'project_id', inserted_log.project_id,
      'service', inserted_log.service,
      'level', inserted_log.level,
      'message', inserted_log.message,
      'metadata', inserted_log.metadata,
      'trace_id', inserted_log.trace_id,
      'tenant_id', inserted_log.tenant_id,
      'tenant_name', inserted_log.tenant_name,
      'source_project', inserted_log.source_project,
      'created_at', inserted_log.created_at
    ));
  END LOOP;

  RETURN logs_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. Índices de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_service_heartbeats_project_id ON service_heartbeats(project_id);
CREATE INDEX IF NOT EXISTS idx_service_heartbeats_status ON service_heartbeats(status);
CREATE INDEX IF NOT EXISTS idx_service_heartbeats_last_seen ON service_heartbeats(last_seen DESC);
