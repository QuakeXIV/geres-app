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
  let actingUserId = null; // quem despoletou a ação
  let targetUserId = null; // para quem vai a notificação (ex: dono do post)

  // 1. LÓGICA DO CRON (Câmara Descartável)
  if (req.query.tipo === 'camara') {
    title = "As fotos foram reveladas! 📸";
    message = "Corre para a Câmara Descartável para ver as figuras de ontem à noite!";
    targetTab = "camera";
  } 
  
  // 2. LÓGICA DO SUPABASE (Posts, Livro - Missões removidas daqui!)
  else if (req.body && req.body.table) {
    const payload = req.body;
    const record = payload.record || {};

    actingUserId = record.user_id || record.author_id || record.created_by || null;

    if (payload.table === 'posts' && payload.type === 'INSERT') {
      title = "Temos conteúdo novo! 🍺";
      message = "Alguém acabou de publicar no feed, vai cuscar!";
      targetTab = "feed";
    } 
    else if (payload.table === 'tasca_quotes' && payload.type === 'INSERT') {
      title = "Nova pérola no Livro! 📖";
      message = "Mais uma frase mítica para a história do Gerês.";
      targetTab = "livro";
    } 
    else {
      return res.status(200).json({ message: 'Ação ignorada (não precisa de notificação)' });
    }
  } 

  // 3. LÓGICA DO FRONTEND (Likes, Comentários e VOTOS NAS MISSÕES)
  else if (req.body && req.body.action) {
    const { action, actorName, targetId, actingId, votosFaltam } = req.body;
    actingUserId = actingId;
    targetUserId = targetId;

    if (action === 'like') {
      title = "Novo Like! ❤️";
      message = `${actorName} curtiu a tua publicação!`;
      targetTab = "feed";
    } else if (action === 'comment') {
      title = "Novo Comentário! 💬";
      message = `${actorName} comentou a tua publicação!`;
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
    } else {
      return res.status(200).json({ message: 'Ação ignorada' });
    }
  }
  
  else {
    return res.status(400).json({ error: 'Pedido inválido' });
  }

  // 4. DISPARAR PARA O ONESIGNAL
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
    } 
    else if (actingUserId) {
      bodyPayload.filters = [
        { field: "tag", key: "app_user_id", relation: "!=", value: String(actingUserId) },
        { operator: "OR" },
        { field: "tag", key: "app_user_id", relation: "not_exists" }
      ];
    } 
    else {
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