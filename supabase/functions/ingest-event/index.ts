import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IngestPayload {
  service: string
  level: string
  message: string
  metadata?: Record<string, unknown>
  trace_id?: string | null
  tenant_id?: string | null
  tenant_name?: string | null
}

interface ProjectRecord {
  id: string
  user_id: string | null
  name: string
  slug: string
  ingest_secret: string
}

serve(async (req: Request) => {
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
    // 1. Validar Presença do Token de Autenticação Ingest
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace(/^Bearer\s+/, '')
    const globalIngestSecret = Deno.env.get('INGEST_SECRET')

    // 2. Inicializar Supabase Client com Service Role (para ignorar RLS nas validações e insert)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let projectId: string | null = null
    let projectUserId: string | null = null
    let sourceProject = 'geral'

    // 3. Autenticação do Projeto e Identificação de Tenant
    if (globalIngestSecret && token === globalIngestSecret) {
      // Fallback para Ingestão Legada da Fase 1 (Usa o projeto padrão 'confia')
      sourceProject = 'confia'
      
      // Busca o projeto padrão 'confia'
      const { data: defaultProject } = await supabase
        .from('projects')
        .select('id, user_id')
        .eq('slug', 'confia')
        .maybeSingle()

      let resolvedProject = defaultProject

      // Se não existir o projeto 'confia', cria-o de forma automática
      if (!resolvedProject) {
        // Encontra um usuário administrador/vip na tabela profiles para associar o projeto
        const { data: adminUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle()

        const defaultUserId = adminUser?.id || null

        const { data: newProject, error: createError } = await supabase
          .from('projects')
          .insert([{
            name: 'Confia',
            slug: 'confia',
            ingest_secret: globalIngestSecret,
            user_id: defaultUserId
          }])
          .select('id, user_id')
          .single()

        if (createError) {
          console.error('Failed to auto-create default Confia project:', createError)
        } else {
          resolvedProject = newProject
        }
      }

      if (resolvedProject) {
        projectId = resolvedProject.id
        projectUserId = resolvedProject.user_id
      }
    } else {
      // Busca o projeto associado a este token exclusivo
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, user_id, name, slug')
        .eq('ingest_secret', token)
        .maybeSingle()

      if (projectError || !project) {
        return new Response(JSON.stringify({ error: 'Unauthorized or invalid ingest token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const typedProject = project as unknown as ProjectRecord
      projectId = typedProject.id
      projectUserId = typedProject.user_id
      sourceProject = typedProject.slug
    }

    // 4. Parsear e Validar Payload
    const body = await req.json() as IngestPayload
    const { service, level, message, metadata, trace_id, tenant_id, tenant_name } = body

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

    // 5. Inserir Evento Vinculado ao Projeto e ao Usuário Proprietário
    const { data: logData, error: logError } = await supabase
      .from('audit_logs')
      .insert([{
        project_id: projectId,
        user_id: projectUserId, // Propaga o user_id do projeto no log para a RLS de leitura funcionar
        source_project: sourceProject,
        service,
        level,
        message,
        metadata: metadata || {},
        trace_id: trace_id || null,
        tenant_id: tenant_id || null,
        tenant_name: tenant_name || null,
        action_type: `observability:${service}:${level}`
      }])
      .select('id')
      .single()

    if (logError) {
      console.error('Database insert error:', logError)
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: logError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 6. Disparar process-alert de forma assíncrona (fire-and-forget)
    // Evita bloquear a resposta ao cliente — falhas no alerta não afetam a ingestão do log
    const alertPayload = {
      record: {
        id:             logData.id,
        project_id:     projectId,
        service,
        level,
        message,
        metadata:       metadata || {},
        trace_id:       trace_id || null,
        tenant_id:      tenant_id || null,
        tenant_name:    tenant_name || null,
        source_project: sourceProject,
        created_at:     new Date().toISOString()
      }
    }

    // Não aguarda (fire-and-forget) para não atrasar a resposta ao cliente
    fetch(`${supabaseUrl}/functions/v1/process-alert`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify(alertPayload)
    }).catch((err: Error) => console.warn('⚠️ process-alert: falha no disparo assíncrono:', err.message))

    return new Response(JSON.stringify({ success: true, id: logData.id }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    const error = err as Error
    console.error('Server error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

