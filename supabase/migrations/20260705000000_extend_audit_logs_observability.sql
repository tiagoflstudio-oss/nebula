-- Migration: Estender a tabela audit_logs para Observabilidade e Monitoramento
-- Criado em: 2026-07-05

-- 1. Estender a tabela audit_logs existente adicionando as colunas necessárias para Observabilidade
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS source_project TEXT NOT NULL DEFAULT 'confia',
  ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  ADD COLUMN IF NOT EXISTS service TEXT,
  ADD COLUMN IF NOT EXISTS trace_id TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS tenant_name TEXT;

-- 2. Criar índices para performance em consultas de observabilidade
CREATE INDEX IF NOT EXISTS idx_audit_logs_service ON audit_logs(service);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_trace ON audit_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source_created ON audit_logs(source_project, created_at DESC);

-- 3. Atualizar Políticas de Segurança (Row Level Security - RLS)
-- Limpar a política de leitura antiga
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;

-- Criar a nova política que permite leitura para o dono do log OR usuários autenticados com cargo de 'admin' ou 'vip'
CREATE POLICY "Users can view audit logs if owner or admin/vip" ON audit_logs
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'vip')
    )
  );
