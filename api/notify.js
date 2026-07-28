export default async function handler(req, res) {
  // Só aceitamos pedidos POST (que vêm do Supabase ou da Vercel)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY;

  let title = "";
  let message = "";
  let targetTab = "feed";

  // -----------------------------------------------------
  // 1. LÓGICA DO CRON (Câmara Descartável)
  // -----------------------------------------------------
  if (req.query.tipo === 'camara') {
    title = "As fotos foram reveladas! 📸";
    message = "Corre para a Câmara Descartável para ver as figuras de ontem à noite!";
    targetTab = "camera";
  } 
  
  // -----------------------------------------------------
  // 2. LÓGICA DO SUPABASE (Novos Posts, Tribunal, Livro)
  // -----------------------------------------------------
  else if (req.body && req.body.table) {
    const payload = req.body;

    // Novo Post no Feed
    if (payload.table === 'feed' && payload.type === 'INSERT') {
      title = "Temos conteúdo novo! 🍺";
      message = "Alguém acabou de publicar no feed, vai cuscar!";
      targetTab = "feed";
    }
    
    // Tribunal (Missão Aprovada) - Ajusta o nome da tabela se for diferente
    else if (payload.table === 'missoes' && payload.type === 'UPDATE' && payload.record.status === 'aprovado') {
      title = "Missão Aprovada! ⚖️";
      message = "O Tribunal falou! Alguém vai ter de beber...";
      targetTab = "missoes";
    }

    // O Livro (Nova Citação)
    else if (payload.table === 'livro' && payload.type === 'INSERT') {
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

  // -----------------------------------------------------
  // 3. DISPARAR PARA O ONESIGNAL
  // -----------------------------------------------------
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["Subscribed Users"],
        headings: { en: title },
        contents: { en: message },
        url: `https://geres-app.vercel.app/?tab=${targetTab}` // Deep Linking em ação!
      })
    });

    const data = await response.json();
    return res.status(200).json({ success: true, response: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}