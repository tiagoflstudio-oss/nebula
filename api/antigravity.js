export default async function handler(req, res) {
  // Configurações de CORS para Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Pre-flight request (CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Header de Authorization ausente' });
    }

    const { action, projectId } = req.body;

    const ANTIGRAVITY_CONFIG = {
      quotaApiUrl: "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels",
      loadProjectApiUrl: "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist",
      userAgent: "antigravity/0.0.1",
    };

    if (action === 'loadProject') {
      const response = await fetch(ANTIGRAVITY_CONFIG.loadProjectApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'User-Agent': ANTIGRAVITY_CONFIG.userAgent
        },
        body: JSON.stringify({ mode: 1 })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    if (action === 'fetchQuota') {
      const cleanProjectId = projectId?.replace('projects/', '');
      const response = await fetch(ANTIGRAVITY_CONFIG.quotaApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'User-Agent': ANTIGRAVITY_CONFIG.userAgent,
          'X-Goog-Api-Client': 'gl-js/ auth/2.0.0 grpc/1.53.0',
          'x-goog-user-project': cleanProjectId || ''
        },
        body: JSON.stringify({})
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(400).json({ error: 'Ação inválida' });

  } catch (error) {
    console.error('API Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
