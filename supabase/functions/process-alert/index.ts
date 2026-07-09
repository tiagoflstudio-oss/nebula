import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AlertRule {
  id: string
  project_id: string
  user_id: string
  name: string
  filter_service: string | null
  filter_level: string | null
  trigger_type: 'immediate' | 'threshold'
  threshold_limit: number | null
  threshold_window_minutes: number | null
  channel: 'whatsapp' | 'email' | 'slack' | 'webhook'
  recipient: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AuditLog {
  id: string
  project_id: string
  user_id: string | null
  source_project: string | null
  service: string
  level: string
  message: string
  metadata?: Record<string, unknown>
  trace_id?: string | null
  tenant_id?: string | null
  tenant_name?: string | null
  action_type?: string
  created_at: string
}

// ─────────────────────────────────────────────────────────────
// Funções de Envio de Notificação por Canal
// ─────────────────────────────────────────────────────────────

/** Envia alerta via WhatsApp (simulado com log detalhado) */
async function sendWhatsApp(recipient: string, message: string): Promise<void> {
  console.log(`📱 [WhatsApp Mock] → ${recipient}: ${message}`)
  await Promise.resolve()
}

/** Envia alerta via E-mail (simulado com log detalhado) */
async function sendEmail(recipient: string, subject: string, body: string): Promise<void> {
  console.log(`📧 [Email Mock] → ${recipient} | Assunto: ${subject}\n${body}`)
  await Promise.resolve()
}

/** Envia alerta via Slack Webhook real (se webhook URL configurada) */
async function sendSlack(webhookUrl: string, message: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  })
  if (!res.ok) throw new Error(`Slack webhook falhou: ${res.status}`)
  console.log(`✅ [Slack] Alerta enviado para webhook.`)
}

/** Envia via Webhook genérico HTTP POST */
async function sendWebhook(url: string, payload: { alert: string; log: AuditLog; message: string }): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`Webhook ${url} falhou: ${res.status}`)
  console.log(`✅ [Webhook] Payload enviado para ${url}`)
}

// ─────────────────────────────────────────────────────────────
// Monta a mensagem de alerta formatada
// ─────────────────────────────────────────────────────────────
function buildAlertMessage(rule: AlertRule, log: AuditLog): string {
  const emoji: Record<string, string> = { critical: '🔴', error: '🟠', warn: '🟡', info: 'ℹ️', debug: '🐛' }
  const icon = emoji[log.level] ?? '⚠️'
  return [
    `${icon} *NEBULA ALERT: ${rule.name}*`,
    `Projeto: ${log.source_project ?? 'N/D'} | Serviço: ${log.service ?? 'N/D'}`,
    `Nível: ${log.level.toUpperCase()} | ${new Date(log.created_at).toLocaleString('pt-BR')}`,
    `Mensagem: ${log.message}`,
    log.trace_id ? `Trace ID: ${log.trace_id}` : '',
    log.tenant_name ? `Cliente: ${log.tenant_name}` : '',
  ].filter(Boolean).join('\n')
}

// ─────────────────────────────────────────────────────────────
// Handler principal da Edge Function
// ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, serviceKey)

    // Recebe o payload do Database Webhook ou chamada direta
    const body = await req.json()

    // O Supabase Database Webhook entrega { type, table, schema, record, old_record }
    const log = (body.record ?? body) as AuditLog

    if (!log || !log.id) {
      return new Response(JSON.stringify({ error: 'Payload inválido: record ausente' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🔔 process-alert: avaliando log ${log.id} | level=${log.level} | service=${log.service} | project_id=${log.project_id}`)

    // 1. Buscar regras ativas para o projeto do log
    const { data: dbRules, error: rulesErr } = await sb
      .from('alert_rules')
      .select('*')
      .eq('project_id', log.project_id)
      .eq('is_active', true)

    if (rulesErr) throw rulesErr
    if (!dbRules || dbRules.length === 0) {
      console.log('Nenhuma regra ativa para este projeto. Encerrando.')
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const rules = dbRules as AlertRule[]
    const results: Array<{ rule_id: string; status: string; channel: string }> = []

    for (const rule of rules) {
      // 2. Avaliar se este log combina com os filtros da regra
      const levelMatch   = !rule.filter_level   || rule.filter_level   === log.level
      const serviceMatch = !rule.filter_service || rule.filter_service === log.service

      if (!levelMatch || !serviceMatch) {
        console.log(`  ↳ Regra "${rule.name}" não combinada — ignorando.`)
        continue
      }

      // 3. Anti-Spam / Agrupamento: verifica se já enviou alerta desta regra
      // nas últimas (threshold_window_minutes * 2) para evitar flood
      const suppressWindowMinutes = (rule.threshold_window_minutes ?? 5) * 2
      const windowStart = new Date(Date.now() - suppressWindowMinutes * 60 * 1000).toISOString()

      const { count: recentCount } = await sb
        .from('alert_history')
        .select('*', { count: 'exact', head: true })
        .eq('rule_id', rule.id)
        .in('sent_status', ['success', 'pending'])
        .gte('created_at', windowStart)

      if ((recentCount ?? 0) >= 1 && rule.trigger_type === 'immediate') {
        console.log(`  ↳ Regra "${rule.name}" SUPRIMIDA por anti-spam (${recentCount} envio(s) recente(s)).`)

        await sb.from('alert_history').insert({
          rule_id:          rule.id,
          project_id:       rule.project_id,
          trigger_log_id:   log.id,
          incident_details: log,
          sent_status:      'suppressed',
        })

        results.push({ rule_id: rule.id, status: 'suppressed', channel: rule.channel })
        continue
      }

      // 4. Para trigger_type 'threshold': verifica se atingiu o limiar de erros
      if (rule.trigger_type === 'threshold') {
        const thresholdWindowStart = new Date(
          Date.now() - (rule.threshold_window_minutes ?? 5) * 60 * 1000
        ).toISOString()

        const { count: errorCount } = await sb
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', rule.project_id)
          .eq('level', rule.filter_level ?? 'error')
          .gte('created_at', thresholdWindowStart)

        if ((errorCount ?? 0) < (rule.threshold_limit ?? 1)) {
          console.log(`  ↳ Regra threshold "${rule.name}": ${errorCount}/${rule.threshold_limit} erros — abaixo do limiar.`)
          continue
        }
        console.log(`  ↳ Regra threshold "${rule.name}": ATINGIU ${errorCount} erros — disparando alerta!`)
      }

      // 5. Disparar notificação pelo canal configurado
      const message = buildAlertMessage(rule, log)
      let sentStatus = 'success'
      let errorMsg: string | null = null

      try {
        if (rule.channel === 'whatsapp') {
          await sendWhatsApp(rule.recipient, message)
        } else if (rule.channel === 'email') {
          await sendEmail(rule.recipient, `[Nebula Alert] ${rule.name}`, message)
        } else if (rule.channel === 'slack') {
          await sendSlack(rule.recipient, message)
        } else if (rule.channel === 'webhook') {
          await sendWebhook(rule.recipient, { alert: rule.name, log, message })
        }
        console.log(`  ✅ Regra "${rule.name}" → ${rule.channel} → ${rule.recipient}`)
      } catch (dispatchErr) {
        sentStatus = 'failed'
        const error = dispatchErr as Error
        errorMsg = error.message
        console.error(`  ❌ Falha ao enviar via ${rule.channel}:`, errorMsg)
      }

      // 6. Registrar no histórico
      await sb.from('alert_history').insert({
        rule_id:          rule.id,
        project_id:       rule.project_id,
        trigger_log_id:   log.id,
        incident_details: log,
        sent_status:      sentStatus,
        error_message:    errorMsg,
      })

      results.push({ rule_id: rule.id, status: sentStatus, channel: rule.channel })
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    const error = err as Error
    console.error('❌ process-alert: erro interno:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

