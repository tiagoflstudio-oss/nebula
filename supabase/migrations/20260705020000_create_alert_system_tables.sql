-- Migration: Sistema de Alertas e Notificações do Nebula
-- Tabelas: alert_rules (regras de disparo) e alert_history (histórico de envios)

-- ============================================================
-- 1. Tabela de regras de alerta
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_rules (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name                     TEXT NOT NULL,
  -- Filtros de disparo
  filter_service           TEXT,          -- ex: 'billing', 'nfe' — null = qualquer serviço
  filter_level             TEXT,          -- ex: 'critical', 'error' — null = qualquer nível
  -- Tipo de disparo
  trigger_type             TEXT NOT NULL DEFAULT 'immediate'
                           CHECK (trigger_type IN ('immediate', 'threshold')),
  threshold_limit          INTEGER DEFAULT 1,          -- N erros...
  threshold_window_minutes INTEGER DEFAULT 5,          -- ...em X minutos
  -- Canal de entrega
  channel                  TEXT NOT NULL
                           CHECK (channel IN ('whatsapp', 'email', 'slack', 'webhook')),
  recipient                TEXT NOT NULL,              -- nº tel, email, webhook URL
  -- Controle
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================
-- 2. Tabela de histórico de alertas disparados
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id          UUID REFERENCES alert_rules(id) ON DELETE CASCADE NOT NULL,
  project_id       UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  -- Detalhes do incidente que acionou
  trigger_log_id   UUID,                -- id do audit_log que disparou (pode ser null em threshold)
  incident_details JSONB DEFAULT '{}'::jsonb,
  -- Resultado do envio
  sent_status      TEXT NOT NULL DEFAULT 'pending'
                   CHECK (sent_status IN ('pending', 'success', 'failed', 'suppressed')),
  error_message    TEXT,                -- mensagem de erro se falhar
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================
-- 3. Habilitar RLS nas novas tabelas
-- ============================================================
ALTER TABLE alert_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Políticas RLS — alert_rules
-- ============================================================
CREATE POLICY "alert_rules: dono ou admin pode visualizar" ON alert_rules
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'vip')
    )
  );

CREATE POLICY "alert_rules: dono pode inserir" ON alert_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alert_rules: dono ou admin pode atualizar" ON alert_rules
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "alert_rules: dono ou admin pode deletar" ON alert_rules
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 5. Políticas RLS — alert_history (somente leitura pelo dono)
-- ============================================================
CREATE POLICY "alert_history: dono ou admin pode visualizar" ON alert_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM alert_rules ar
      WHERE ar.id = alert_history.rule_id AND ar.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'vip')
    )
  );

-- Inserção aberta ao service_role (Edge Function) apenas via bypass RLS
-- A Edge Function usa o client com privilégio elevado (service_role), portanto
-- não precisa de policy de INSERT para o usuário final.

-- ============================================================
-- 6. Índices de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alert_rules_project_id   ON alert_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_is_active     ON alert_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_history_rule_id     ON alert_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_project_id  ON alert_history(project_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_created_at  ON alert_history(created_at DESC);
