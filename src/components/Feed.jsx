import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Send } from 'lucide-react';

export default function Feed({ session }) {
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState({});
  
  // NOSSO ESTADO DOS AVISOS (Toasts)
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  useEffect(() => {
    carregarPosts();
  }, []);

  async function carregarPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username), likes(user_id), comments(*, profiles(username))')
      .eq('is_disposable', false)
      .order('created_at', { ascending: false });

    if (!error) setPosts(data);
  }

  async function publicarPost(e) {
    e.preventDefault();
    
    if (!file) {
      return showToast('Escolhe uma foto ou vídeo primeiro!', 'error');
    }

    // Limite do Supabase gratuito: 50MB (50 * 1024 * 1024 bytes)
    if (file.size > 50 * 1024 * 1024) {
      return showToast('O ficheiro é muito pesado! (Máx: 50MB). Tenta um vídeo mais curto.', 'error');
    }

    setUploading(true);
    showToast('A enviar para a nuvem... (Pode demorar se for vídeo)', 'success');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // 1. Upload
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file);

    if (uploadError) {
      showToast(`Erro a enviar: ${uploadError.message}`, 'error');
      setUploading(false);
      return;
    }

    // 2. Obter URL
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

    // O iPhone às vezes esconde a extensão do tipo, por isso olhamos também para o final do nome
    const isVideo = file.type.startsWith('video') || fileExt.match(/(mp4|mov|webm|avi)$/i);

    // 3. Guardar na BD
    const { error: dbError } = await supabase.from('posts').insert([{
      user_id: session.user.id,
      media_url: publicUrl,
      media_type: isVideo ? 'video' : 'image',
      caption,
      is_disposable: false
    }]);

    if (dbError) {
      showToast(`Erro na Base de Dados: ${dbError.message}`, 'error');
    } else {
      showToast('Publicado com sucesso! 🚀', 'success');
      setCaption('');
      setFile(null);
      document.getElementById('file-input').value = '';
      carregarPosts();
    }
    
    setUploading(false);
  }

  async function toggleLike(postId, jaDeuLike) {
    if (jaDeuLike) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', session.user.id);
    } else {
      await supabase.from('likes').insert([{ post_id: postId, user_id: session.user.id }]);
    }
    carregarPosts();
  }

  async function adicionarComentario(postId) {
    const texto = commentText[postId];
    if (!texto) return;

    await supabase.from('comments').insert([{
      post_id: postId,
      user_id: session.user.id,
      content: texto
    }]);

    setCommentText({ ...commentText, [postId]: '' });
    carregarPosts();
  }

  return (
    <div style={{ padding: '10px' }}>
      {/* Sistema de Aviso a flutuar no ecrã */}
      {toast.show && (
        <div className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'sticky', top: '75px', zIndex: 50 }}>
          {toast.message}
        </div>
      )}

      <div className="card">
        <h3 style={{ margin: '0 0 15px 0' }}>📸 Publicar no Feed</h3>
        <form onSubmit={publicarPost}>
          <input
            id="file-input"
            className="input-field"
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ padding: '10px' }}
          />
          <input
            className="input-field"
            type="text"
            placeholder="Escreve uma legenda..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button className="btn-primary" disabled={uploading}>
            {uploading ? 'A enviar... aguarda ⏳' : 'Publicar'}
          </button>
        </form>
      </div>

      {posts.map((post) => {
        const jaDeuLike = post.likes?.some((l) => l.user_id === session.user.id);

        return (
          <div key={post.id} className="card">
            <p style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)', fontSize: '15px' }}>
              @{post.profiles?.username || 'Membro'}
            </p>

            {/* O playsInline é obrigatório para os iPhones! */}
            {post.media_type === 'video' ? (
              <video src={post.media_url} controls playsInline style={{ width: '100%', borderRadius: '12px' }} />
            ) : (
              <img src={post.media_url} alt="Media" style={{ width: '100%', borderRadius: '12px' }} />
            )}

            <p style={{ margin: '12px 0', color: 'var(--text)', fontSize: '14px' }}>{post.caption}</p>

            <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
              <button
                style={{ background: 'none', border: 'none', color: jaDeuLike ? '#ef4444' : 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
                onClick={() => toggleLike(post.id, jaDeuLike)}
              >
                <Heart fill={jaDeuLike ? '#ef4444' : 'none'} size={24} />
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{post.likes?.length || 0}</span>
              </button>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px' }}>
              {post.comments?.map((c) => (
                <p key={c.id} style={{ fontSize: '13px', margin: '6px 0', color: 'var(--text)' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>@{c.profiles?.username}: </span>
                  {c.content}
                </p>
              ))}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input
                  className="input-field"
                  style={{ padding: '8px 12px', fontSize: '14px', margin: 0 }}
                  type="text"
                  placeholder="Comentar..."
                  value={commentText[post.id] || ''}
                  onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                />
                <button
                  style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer' }}
                  onClick={() => adicionarComentario(post.id)}
                >
                  <Send size={18} color="white" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}