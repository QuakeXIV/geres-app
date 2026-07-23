import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Camera, Lock } from 'lucide-react';

export default function DisposableCamera({ session }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [revealedPosts, setRevealedPosts] = useState([]);

  useEffect(() => {
    carregarFotosDescartaveis();
  }, []);

  async function carregarFotosDescartaveis() {
    const agora = new Date().toISOString();

    // Saca apenas as fotos descartáveis cuja data de revelação já passou
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username)')
      .eq('is_disposable', true)
      .lte('reveal_at', agora)
      .order('created_at', { ascending: false });

    if (data) setRevealedPosts(data);
  }

  async function tirarFotoDescartavel(e) {
    e.preventDefault();
    if (!file) return alert('Escolhe uma foto!');
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const filePath = `disposable/${Math.random()}.${fileExt}`;

    await supabase.storage.from('media').upload(filePath, file);
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

    // Define a revelação para o meio-dia do dia seguinte
    const amanhaMeioDia = new Date();
    amanhaMeioDia.setDate(amanhaMeioDia.getDate() + 1);
    amanhaMeioDia.setHours(10, 0, 0, 0);

    await supabase.from('posts').insert([{
      user_id: session.user.id,
      media_url: publicUrl,
      media_type: 'image',
      caption: '📸 Foto Descartável de Ontem',
      is_disposable: true,
      reveal_at: amanhaMeioDia.toISOString()
    }]);

    setFile(null);
    setUploading(false);
    alert('Foto guardada na película! Só será revelada amanhã ao meio-dia. 🔒');
  }

  return (
    <div style={{ padding: '10px' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>📸 Câmara Descartável</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          Tira fotos agora. Ninguém as pode ver até às 12:00 do dia seguinte!
        </p>

        <form onSubmit={tirarFotoDescartavel}>
          <input
            className="input-field"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button className="btn-primary" disabled={uploading}>
            {uploading ? 'A guardar foto...' : 'Disparar para a Película 🔒'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>🖼️ Fotos Reveladas de Ontem</h3>
        {revealedPosts.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center' }}>
            Nenhuma foto revelada ainda. Volta amanhã às 12:00!
          </p>
        ) : (
          revealedPosts.map(p => (
            <div key={p.id} style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '12px', fontWeight: 'bold' }}>@{p.profiles?.username}</p>
              <img src={p.media_url} style={{ width: '100%', borderRadius: '8px' }} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}