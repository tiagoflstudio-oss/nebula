-- Migration: Criação da tabela de projects e relacionamento com audit_logs para suporte multitenant
-- 1. Criar a tabela de projetos (projects)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ingest_secret TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  github_repo_url TEXT,
  uptime_url TEXT,
  sentry_org TEXT,
  sentry_project TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- 2. Habilitar RLS (Row Level Security) na tabela de projetos
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- 3. Criar Políticas RLS para a tabela de projetos
-- Permitir leitura se o usuário for proprietário do projeto OR se for administrador/VIP do Nebula
CREATE POLICY "Users can view projects if owner or admin/vip" ON projects FOR
SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'vip')
    )
  );
-- Permitir inserção apenas para usuários autenticados (o user_id deve ser o próprio usuário autenticado)
CREATE POLICY "Users can insert their own projects" ON projects FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Permitir atualização apenas se o usuário for proprietário OR se for administrador
CREATE POLICY "Users can update projects if owner or admin" ON projects FOR
UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
-- Permitir exclusão apenas se o usuário for proprietário OR se for administrador
CREATE POLICY "Users can delete projects if owner or admin" ON projects FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);
-- 4. Estender a tabela audit_logs para associá-la a projetos
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE
SET NULL;
-- 5. Criar índice de performance para buscas por projeto em logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);