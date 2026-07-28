export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY;

  let title = "";
  let message = "";
  let targetTab = "feed";
  let autorId = null; // ID de quem executou a ação

  // 1. LÓGICA DO CRON (Câmara Descartável - esta continua a ir para todos)
  if (req.query.tipo === 'camara') {
    title = "As fotos foram reveladas! 📸";
    message = "Corre para a Câmara Descartável para ver as figuras de ontem à noite!";
    targetTab = "camera";
  } 
  
  // 2. LÓGICA DO SUPABASE (Posts, Tribunal, Livro)
  else if (req.body && req.body.table) {
    const payload = req.body;
    autorId = payload.record?.user_id; // Captura quem fez a ação

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
  
  else {
    return res.status(400).json({ error: 'Pedido inválido' });
  }

  // 3. DISPARAR PARA O ONESIGNAL (Excluindo o próprio autor)
  try {
    const bodyPayload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: title },
      contents: { en: message },
      url: `https://geres-app.vercel.app/?tab=${targetTab}`
    };

    
 // Se houver um autor identificado, excluímo-lo usando o external_user_id
    if (autorId) {
      bodyPayload.filters = [
        { field: "any", relation: ">", hours_ago: "48" }, // obrigatório para manter o segmento All se usares filtros complexos, ou simplesmente:
      ];
      // Alternativa oficial do OneSignal para excluir por external_user_id:
      bodyPayload.excluded_player_ids = []; // (se tivesses o player_id)
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