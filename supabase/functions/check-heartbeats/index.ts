import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LogRecord {
  id: string
  project_id: string
  service: string
  level: string
  message: string
  metadata?: Record<string, unknown>
  trace_id?: string | null
  tenant_id?: string | null
  tenant_name?: string | null
  source_project?: string | null
  created_at: string
}

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, serviceKey)

    console.log("⏰ check-heartbeats: Iniciando varredura de timeouts...")

    // 1. Chamar a procedure remota no banco que atualiza status e insere logs de inatividade
    const { data: expiredLogs, error: rpcError } = await sb.rpc('check_service_heartbeats')

    if (rpcError) {
      console.error("❌ check-heartbeats: Erro ao rodar RPC check_service_heartbeats:", rpcError)
      throw rpcError
    }

    const logsArray = (Array.isArray(expiredLogs) ? expiredLogs : []) as LogRecord[]
    console.log(`⏰ check-heartbeats: Varredura concluída. ${logsArray.length} timeouts detectados.`)

    // 2. Para cada log crítico gerado na varredura, disparar a Edge Function process-alert
    const alertPromises = logsArray.map(async (logRecord: LogRecord) => {
      try {
        console.log(`  🔔 check-heartbeats: Disparando alerta para log de inatividade ${logRecord.id}`)
        
        const alertPayload = { record: logRecord }
        
        const response = await fetch(`${supabaseUrl}/functions/v1/process-alert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`
          },
          body: JSON.stringify(alertPayload)
        })

        if (!response.ok) {
          console.warn(`  ⚠️ check-heartbeats: process-alert retornou status ${response.status} para o log ${logRecord.id}`)
        } else {
          console.log(`  ✅ check-heartbeats: Alerta processado com sucesso para o log ${logRecord.id}`)
        }
      } catch (err) {
        const error = err as Error
        console.error(`  ❌ check-heartbeats: Falha ao disparar process-alert para o log ${logRecord.id}:`, error.message)
      }
    })

    // Aguarda todos os disparos serem completados
    await Promise.all(alertPromises)

    return new Response(JSON.stringify({ 
      success: true, 
      checked_at: new Date().toISOString(),
      timeouts_detected: logsArray.length,
      alerts_dispatched: logsArray.map(l => ({ id: l.id, service: l.service, tenant: l.tenant_name }))
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    const error = err as Error
    console.error('❌ check-heartbeats: Erro interno no servidor:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

