export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY;

  let title = "";
  let message = "";
  let targetTab = "feed";
  let autorId = null;

  if (req.query.tipo === 'camara') {
    title = "As fotos foram reveladas! 📸";
    message = "Corre para a Câmara Descartável para ver as figuras de ontem à noite!";
    targetTab = "camera";
  } else if (req.body && req.body.table) {
    const payload = req.body;
    autorId = payload.record?.user_id; // O ID de quem fez a ação

    if (payload.table === 'posts' && payload.type === 'INSERT') {
      title = "Temos conteúdo novo! 🍺";
      message = "Alguém acabou de publicar no feed, vai cuscar!";
      targetTab = "feed";
    } else if (payload.table === 'challenge_approvals' && (payload.type === 'INSERT' || payload.type === 'UPDATE')) {
      title = "Missão Aprovada! ⚖️";
      message = "O Tribunal falou! Alguém vai ter de beber...";
      targetTab = "missoes";
    } else if (payload.table === 'tasca_quotes' && payload.type === 'INSERT') {
      title = "Nova pérola no Livro! 📖";
      message = "Mais uma frase mítica para a história do Gerês.";
      targetTab = "livro";
    } else {
      return res.status(200).json({ message: 'Ação ignorada' });
    }
  } else {
    return res.status(400).json({ error: 'Pedido inválido' });
  }

  try {
    const bodyPayload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: title },
      contents: { en: message },
      url: `https://geres-app.vercel.app/?tab=${targetTab}`
    };

    // Exclusão limpa por external_user_id suportada pela API do OneSignal
    if (autorId) {
      bodyPayload.filters = [
        { field: "external_user_id", relation: "!=", value: autorId }
      ];
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