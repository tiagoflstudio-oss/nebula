# 🌙 Handover: Migração OAuth para Edge Function (Nebula)

**Data/Hora da Pausa:** 2026-04-28 (Sessão de Madrugada)
**Objetivo Principal:** Migrar o fluxo de OAuth do Google do Frontend para uma Edge Function do Supabase, resolvendo o erro de `client_secret is missing` sem expor as credenciais de segurança do projeto.

---

## ✅ O Que Foi Feito Até Agora
1. **Identificação do Problema:** O fluxo "Automático (OAuth)" falhou porque aplicativos Web requerem `client_secret`, o que é inseguro de se manter no código Frontend (`oauthService.js`).
2. **Criação da Edge Function:** O código da função foi criado localmente em `supabase/functions/oauth-exchange/index.ts`. Ele já possui a lógica para trocar o `code` pelos tokens no Google.
3. **Setup do Supabase CLI:** O usuário logou na CLI com sucesso (`npx supabase login`).
4. **Vinculação do Projeto:** O projeto local foi conectado ao Supabase Cloud (`npx supabase link --project-ref kejbqdeupmsvupvityrt`).

---

## ⏸️ Onde Paramos (Pausa)
O usuário estava buscando a chave **Client Secret** no painel do Google Cloud Console para gravar nos segredos (secrets) da nuvem do Supabase.

---

## 🚀 Próximos Passos (Para a próxima sessão)

**Passo 1: Gravar as chaves no Supabase**
Assim que o usuário encontrar o Client Secret no Google Cloud, rodar o comando:
```bash
npx supabase secrets set GOOGLE_CLIENT_ID="1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com" GOOGLE_CLIENT_SECRET="<SECRET_COPIADO>"
```

**Passo 2: Deploy da Função**
```bash
npx supabase functions deploy oauth-exchange
```

**Passo 3: Refatorar o Frontend (`oauthService.js`)**
Alterar a função `exchangeCode` para fazer um `POST` para a nossa nova Edge Function (URL: `https://kejbqdeupmsvupvityrt.supabase.co/functions/v1/oauth-exchange`) ao invés de bater direto no `oauth2.googleapis.com`. O Frontend passará apenas o `code` e o `redirect_uri`.

**Passo 4: Teste End-to-End**
Tentar conectar a cota via modo "Automático (OAuth)". Se retornar o token sem erros e salvar no banco, o sistema está pronto para produção e escalável para clientes finais.

---
*Bom descanso! Quando acordar, basta colar esse arquivo no chat ou pedir para eu ler o `HANDOVER_OAUTH.md` que continuaremos de onde paramos.*
