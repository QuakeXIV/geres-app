export default async function handler(req, res) {
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
  
  // 2. LÓGICA DO SUPABASE (Posts, Tribunal, Livro)
  else if (req.body && req.body.table) {
    const payload = req.body;
    const record = payload.record || {};

    // Captura o ID de quem executou a ação
    actingUserId = record.user_id || record.author_id || record.created_by || null;

    // Novo Post no Feed
    if (payload.table === 'posts' && payload.type === 'INSERT') {
      title = "Temos conteúdo novo! 🍺";
      message = "Alguém acabou de publicar no feed, vai cuscar!";
      targetTab = "feed";
    } 
    
    // Tribunal (Missão Aprovada)
    else if (payload.table === 'challenge_approvals' && (payload.type === 'INSERT' || payload.type === 'UPDATE')) {
      title = "Missão Aprovada! ⚖️";
      message = "O Tribunal falou! Alguém vai ter de beber...";
      targetTab = "missoes";
    } 

    // O Livro (Nova Citação)
    else if (payload.table === 'tasca_quotes' && payload.type === 'INSERT') {
      title = "Nova pérola no Livro! 📖";
      message = "Mais uma frase mítica para a história do Gerês.";
      targetTab = "livro";
    } 
    
    else {
      return res.status(200).json({ message: 'Ação ignorada (não precisa de notificação)' });
    }
  } 

  // 3. LÓGICA DO FRONTEND (Likes e Comentários)
  else if (req.body && req.body.action) {
    const { action, actorName, targetId, actingId } = req.body;
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

    // Se tivermos um alvo específico (dono do post), enviamos SÓ PARA ELE
    if (targetUserId) {
      bodyPayload.filters = [
        { field: "tag", key: "app_user_id", relation: "=", value: String(targetUserId) }
      ];
    } 
    // Se não, e se houver um autor, filtramos para enviar a todos EXCETO a ele
    else if (actingUserId) {
      bodyPayload.filters = [
        { field: "tag", key: "app_user_id", relation: "!=", value: String(actingUserId) },
        { operator: "OR" },
        { field: "tag", key: "app_user_id", relation: "not_exists" }
      ];
    } 
    // Se for global sem autor (ex: cron da câmara)
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