-- Habilitar extensão de vetores (Essencial para o RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- Schema for RAG Documents (Garante que não dê erro se as tabelas já existirem)
CREATE TABLE IF NOT EXISTS public.knowledge_bases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kb_id uuid REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adiciona a coluna vetorial com segurança (ignora se já existir)
ALTER TABLE public.knowledge_documents ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Cria o índice vetorial para buscas rápidas com segurança
CREATE INDEX IF NOT EXISTS knowledge_documents_embedding_idx ON public.knowledge_documents USING hnsw (embedding vector_cosine_ops);

-- Habilitar RLS
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Derrubar políticas antigas (se existirem) para não dar erro de duplicação, e então recriá-las
DROP POLICY IF EXISTS "Users can manage their own knowledge bases" ON public.knowledge_bases;
CREATE POLICY "Users can manage their own knowledge bases" 
  ON public.knowledge_bases FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own knowledge documents" ON public.knowledge_documents;
CREATE POLICY "Users can manage their own knowledge documents" 
  ON public.knowledge_documents FOR ALL USING (auth.uid() = user_id);

-- Função RPC (Stored Procedure) para busca de documentos por similaridade de cosseno
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  base_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  kb_id uuid,
  filename text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.kb_id,
    kd.filename,
    kd.content,
    1 - (kd.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_documents kd
  WHERE 1 - (kd.embedding <=> query_embedding) > match_threshold
    AND (base_id IS NULL OR kd.kb_id = base_id)
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;