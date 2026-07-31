export default async function handler(req, res) {
  // ⚠️ PASSAPORTE DE SEGURANÇA (CORS) PARA O BROWSER NÃO BLOQUEAR
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responde imediatamente aos pedidos de verificação do browser
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY;

  let title = "";
  let message = "";
  let targetTab = "feed";
  let actingUserId = null; 
  let targetUserId = null; 

  // 1. LÓGICA DO CRON (Câmara Descartável às 12:00)
  if (req.query && req.query.tipo === 'camara') {
    title = "As fotos foram reveladas! 📸";
    message = "Corre para a Câmara Descartável para ver as figuras de ontem à noite!";
    targetTab = "camera";

    // Vamos perguntar diretamente à Base de Dados quem foi o último a publicar uma foto descartável
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const url = `${supabaseUrl}/rest/v1/posts?is_disposable=eq.true&select=profiles(username)&order=created_at.desc&limit=1`;
        const dbRes = await fetch(url, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        const dbData = await dbRes.json();
        
        if (dbData && dbData.length > 0 && dbData[0].profiles?.username) {
          const ultimoMembro = dbData[0].profiles.username;
          message = `@${ultimoMembro} foi a última pessoa a esconder lá uma foto. Vai ver a desgraça!`;
        }
      } catch (err) {
        console.log("Erro a ir buscar o último fotógrafo:", err);
      }
    }
  } 
  
  // 2. LÓGICA DIRETA DA APP (FRONTEND) COM NOMES REAIS
  else if (req.body) {
    // 🛡️ SEGURANÇA EXTRA: Garante que o body é sempre interpretado como JSON, mesmo que a Vercel se passe
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    if (body && body.action) {
      const { action, actorName, targetId, actingId, votosFaltam, extraInfo, postOwnerName } = body;
      
      actingUserId = actingId;
      targetUserId = targetId;

      if (action === 'new_post') {
        title = "Temos conteúdo novo! 🍺";
        message = `${actorName} acabou de publicar no feed, vai cuscar!`;
        targetTab = "feed";
      } else if (action === 'new_story') {
        title = "Novo Story! 📸";
        message = `${actorName} adicionou um story novo. Desaparece em 24h!`;
        targetTab = "feed";
      } else if (action === 'mention') {
        title = "Foste apanhado! 🎯";
        message = `${actorName} mencionou-te numa publicação! Vai ver o que disseram de ti.`;
        targetTab = "feed";
      } else if (action === 'like') {
        title = "Novo Like! ❤️";
        message = `${actorName} curtiu a tua publicação!`;
        targetTab = "feed";
      } else if (action === 'comment') {
        title = "Novo Comentário! 💬";
        message = `${actorName} comentou a tua publicação!`;
        targetTab = "feed";
      } else if (action === 'reply') {
        title = "Responderam-te! 💬";
        message = `${actorName} respondeu-te na publicação de ${postOwnerName || 'alguém'}`;
        targetTab = "feed";
      } else if (action === 'mission_approval') {
        targetTab = "missoes";
        if (votosFaltam === 0) {
          title = "Missão Concluída! ✅";
          message = `${actorName} deu o último voto. Missão aprovada e 1 ponto para ti!`;
        } else {
          title = "Novo Voto no Tribunal ⚖️";
          message = `${actorName} aprovou a tua missão. Faltam ${votosFaltam} votos!`;
        }
      } else if (action === 'new_quote') {
        title = "Nova pérola no Livro! 📖";
        message = `${actorName} eternizou uma barbaridade dita por ${extraInfo}!`;
        targetTab = "livro";
      } else {
        return res.status(200).json({ message: 'Ação ignorada' });
      }
    } else {
      return res.status(400).json({ error: 'Pedido inválido, sem action declarada' });
    }
  } 
  
  else {
    return res.status(400).json({ error: 'Pedido totalmente inválido' });
  }

  // 3. DISPARAR PARA O ONESIGNAL
  try {
    const bodyPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      url: `https://geres-app.vercel.app/?tab=${targetTab}`
    };

    if (targetUserId) {
      bodyPayload.filters = [
        { field: "tag", key: "app_user_id", relation: "=", value: String(targetUserId) }
      ];
    } else if (actingUserId) {
      bodyPayload.filters = [
        { field: "tag", key: "app_user_id", relation: "!=", value: String(actingUserId) },
        { operator: "OR" },
        { field: "tag", key: "app_user_id", relation: "not_exists" }
      ];
    } else {
      bodyPayload.included_segments = ["All"];
    }

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify(bodyPayload)
    });

    const data = await response.json();
    return res.status(200).json({ success: true, response: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}