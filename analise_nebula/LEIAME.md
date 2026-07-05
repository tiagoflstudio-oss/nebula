# 🌌 Central de Auditoria Cloud e IA (Nebula AI)

Esta pasta foi projetada para organizar, otimizar e compactar o código-fonte lógico do Nebula AI para auditorias externas em plataformas de IA (como o Claude/Antigravity ou Opus).

---

## 🛠️ Como funciona a Compactação?
Para que a IA analise a arquitetura do projeto de forma eficiente e rápida, **não** são necessários arquivos de dependências físicas (`node_modules`), builds compilados de front-end (`dist`) ou o histórico interno de controle de versão (`.git`).

Por esse motivo, nossa rotina automatizada utiliza uma **lista de permissões (whitelist)**, incluindo estritamente o código-fonte essencial:
* `/src` (Lógica de páginas, componentes React, estilos e hooks)
* `/public` (Ativos estáticos da web)
* `/supabase` (Migrations do banco de dados, schemas e Edge Functions)
* `/api` (Endpoints de integração local)
* `/analise_nebula` (Nossos relatórios técnicos e scripts de auditoria)
* Configurações chaves da raiz (`package.json`, `eslint.config.js`, `index.html`, `vite.config.js`, `nebula-bridge.js`, `nebula-bridge.cjs`, `README.md`, etc.)

Isso faz com que o arquivo ZIP de auditoria final fique extremamente leve, pesando **menos de 5 MB**, ficando incrivelmente abaixo do limite regulamentar de **35 MB**.

---

## 🚀 Como re-gerar o ZIP de Auditoria a qualquer momento

Sempre que você efetuar alterações importantes no código-fonte e quiser enviar a versão atualizada para a auditoria, basta re-gerar o arquivo ZIP em 2 segundos seguindo este passo simples:

1. Abra o **PowerShell** na raiz do projeto ou no VS Code.
2. Execute o script de automação rodando o comando:
   ```powershell
   .\analise_nebula\gerar_zip_auditoria.ps1
   ```
3. O script irá limpar a versão anterior e gerar o arquivo [analise_nebula.zip](file:///c:/Users/tiago/OneDrive/Desktop/Mestre%20Clientes/nebula/analise_nebula/analise_nebula.zip) totalmente atualizado e pronto para upload, exibindo o tamanho final no terminal.

---
*Pasta projetada pela Engenharia de Sistemas Nebula AI.*
