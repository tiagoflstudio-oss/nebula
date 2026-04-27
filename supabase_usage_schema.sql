-- SCHEMA: Nebula OS & PicoClaw (Auditoria e Skills)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Auditoria do PicoClaw (Logs do Sistema)

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Habilidades do Ecossistema Nebula
CREATE TABLE IF NOT EXISTS skills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    command_template TEXT NOT NULL,
    category TEXT DEFAULT 'utility',
    icon TEXT DEFAULT 'extension',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Logs de Uso de IA
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost NUMERIC(10, 5) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Cotas de Usuários
CREATE TABLE IF NOT EXISTS user_quotas (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    total_limit BIGINT DEFAULT 1000000, -- 1M tokens padrão
    used_tokens BIGINT DEFAULT 0,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Conexões de Provedores (Tokens e OAuth)
CREATE TABLE IF NOT EXISTS provider_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    provider TEXT NOT NULL,
    name TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    auth_type TEXT DEFAULT 'apikey', -- 'apikey' ou 'oauth'
    credentials JSONB DEFAULT '{}'::jsonb, -- Para chaves legadas
    settings JSONB DEFAULT '{}'::jsonb,    -- Para client_id, client_secret, etc.
    models JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_connections ENABLE ROW LEVEL SECURITY;

-- Limpar políticas existentes para evitar erros de duplicidade
DO $$ 
BEGIN
    -- Audit Logs
    DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
    -- Skills
    DROP POLICY IF EXISTS "Users can view active skills" ON skills;
    -- Usage Logs
    DROP POLICY IF EXISTS "Users can view their own usage" ON usage_logs;
    DROP POLICY IF EXISTS "Users can insert their own usage" ON usage_logs;
    -- User Quotas
    DROP POLICY IF EXISTS "Users can view their own quota" ON user_quotas;
    -- Provider Connections
    DROP POLICY IF EXISTS "Users can view their own connections" ON provider_connections;
    DROP POLICY IF EXISTS "Users can manage their own connections" ON provider_connections;
END $$;

-- Criar Políticas de Segurança
CREATE POLICY "Users can view their own audit logs" ON audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view active skills" ON skills FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their own usage" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own usage" ON usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own quota" ON user_quotas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own connections" ON provider_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own connections" ON provider_connections FOR ALL USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_user ON provider_connections(user_id);