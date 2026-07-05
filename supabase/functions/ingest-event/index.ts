import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS Preflight
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
    // 1. Validar Token de Autenticação Ingest
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace(/^Bearer\s+/, '')
    const ingestSecret = Deno.env.get('INGEST_SECRET')

    if (!ingestSecret || token !== ingestSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Parsear e Validar Payload
    const body = await req.json()
    const { source_project, service, level, message, metadata, trace_id, tenant_id, tenant_name } = body

    if (!service || !level || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: service, level, message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const validLevels = ['debug', 'info', 'warn', 'error', 'critical']
    if (!validLevels.includes(level)) {
      return new Response(JSON.stringify({ error: `Invalid level. Must be one of: ${validLevels.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Inicializar Supabase Client com Service Role para ignorar RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 4. Inserir Evento
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([{
        source_project: source_project || 'confia',
        service,
        level,
        message,
        metadata: metadata || {},
        trace_id: trace_id || null,
        tenant_id: tenant_id || null,
        tenant_name: tenant_name || null,
        action_type: `observability:${service}:${level}` // mantendo compatibilidade com action_type obrigatório
      }])
      .select('id')
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Server error:', err)
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
