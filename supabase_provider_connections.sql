-- Tabela de Conexões de Provedores para o Rastreador de Cota
CREATE TABLE IF NOT EXISTS provider_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- antigravity, github, claude, codex, etc.
    name TEXT, -- Nome amigável ou e-mail da conta
    auth_type TEXT NOT NULL DEFAULT 'oauth', -- oauth ou apikey
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb, -- Configurações específicas do provedor
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE provider_connections ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Users can view their own connections"
    ON provider_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
    ON provider_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
    ON provider_connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
    ON provider_connections FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_provider_connections_updated_at
    BEFORE UPDATE ON provider_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
