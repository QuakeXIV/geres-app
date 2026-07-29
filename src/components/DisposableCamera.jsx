import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Camera, Lock } from 'lucide-react';

export default function DisposableCamera({ session }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [revealedPosts, setRevealedPosts] = useState([]);
  
  // O estado do nosso toast bonito
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  useEffect(() => {
    carregarFotosDescartaveis();

    const recarregarSeVisivel = () => {
      if (document.visibilityState === 'visible') {
        carregarFotosDescartaveis();
      }
    };

    document.addEventListener('visibilitychange', recarregarSeVisivel);
    window.addEventListener('focus', recarregarSeVisivel);

    return () => {
      document.removeEventListener('visibilitychange', recarregarSeVisivel);
      window.removeEventListener('focus', recarregarSeVisivel);
    };
  }, []);

  async function carregarFotosDescartaveis() {
    const agora = new Date().toISOString();

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
    if (!file) return showToast('Escolhe uma foto primeiro!', 'error');
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `disposable/${Math.random()}.${fileExt}`;

      await supabase.storage.from('media').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

      const amanhaMeioDia = new Date();
      amanhaMeioDia.setDate(amanhaMeioDia.getDate() + 1);
      amanhaMeioDia.setHours(10, 0, 0, 0);

      const { error } = await supabase.from('posts').insert([{
        user_id: session.user.id,
        media_url: publicUrl,
        media_type: 'image',
        caption: '📸 Foto Descartável de Ontem',
        is_disposable: true,
        reveal_at: amanhaMeioDia.toISOString()
      }]);

      if (error) throw error;

      setFile(null);
      showToast('Foto guardada na película! Só será revelada amanhã às 12:00. 🔒', 'success');
    } catch (err) {
      showToast(`Erro ao guardar: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: '10px' }}>
      
      {/* RENDERIZAÇÃO DO TOAST */}
      {toast.show && (
        <div className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'fixed', top: 'calc(80px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '90%', maxWidth: '400px' }}>
          {toast.message}
        </div>
      )}

      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 0 10px 0' }}>
          <Camera size={26} color="var(--accent)"/> Câmara Descartável
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px' }}>
          Tira fotos agora. Ninguém as pode ver até às 12:00 do dia seguinte!
        </p>

        <form onSubmit={tirarFotoDescartavel}>
          <input
            className="input-field"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ padding: '15px' }}
          />
          <button className="btn-primary" disabled={uploading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} />
            {uploading ? 'A guardar foto...' : 'Disparar para a Película'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>🖼️ Fotos Reveladas de Ontem</h3>
        {revealedPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
            <span style={{ fontSize: '30px', display: 'block', marginBottom: '10px' }}>🎞️</span>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)' }}>
              Nenhuma foto revelada ainda. Volta amanhã às 12:00!
            </p>
          </div>
        ) : (
          revealedPosts.map(p => (
            <div key={p.id} style={{ marginBottom: '20px', background: 'var(--input-bg)', padding: '10px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 5px', color: 'var(--accent)' }}>@{p.profiles?.username}</p>
              <img src={p.media_url} style={{ width: '100%', borderRadius: '12px', display: 'block' }} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}