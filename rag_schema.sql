-- Schema for RAG Documents

CREATE TABLE public.knowledge_bases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.knowledge_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kb_id uuid REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own knowledge bases"
  ON public.knowledge_bases
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own knowledge documents"
  ON public.knowledge_documents
  FOR ALL
  USING (auth.uid() = user_id);
