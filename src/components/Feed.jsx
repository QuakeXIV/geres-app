import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Send, Plus, X } from 'lucide-react';

export default function Feed({ session }) {
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState({});
  
  // Controlo da nova janela de publicação (Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Aviso que aparece garantidamente por cima de tudo
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
    
    // TRY/CATCH para apanhar QUALQUER erro silencioso
    try {
      if (!file) {
        return showToast('Escolhe uma foto ou vídeo primeiro!', 'error');
      }

      if (file.size > 50 * 1024 * 1024) {
        return showToast('O ficheiro é muito pesado! (Máx: 50MB).', 'error');
      }

      setUploading(true);
      showToast('A enviar para a nuvem... ⏳', 'success');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw new Error(`Erro Upload: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
      const isVideo = file.type.startsWith('video') || fileExt.match(/(mp4|mov|webm|avi)$/i);

      const { error: dbError } = await supabase.from('posts').insert([{
        user_id: session.user.id,
        media_url: publicUrl,
        media_type: isVideo ? 'video' : 'image',
        caption,
        is_disposable: false
      }]);

      if (dbError) throw new Error(`Erro BD: ${dbError.message}`);

      // Sucesso!
      showToast('Publicado com sucesso! 🚀', 'success');
      setCaption('');
      setFile(null);
      setIsModalOpen(false); // Fecha a janela
      carregarPosts();
      
    } catch (err) {
      showToast(err.message, 'error'); // Mostra qualquer erro oculto
    } finally {
      setUploading(false);
    }
  }

 async function toggleLike(postId, jaDeuLike) {
    // 1. ATUALIZAÇÃO OTIMISTA: Muda o ecrã imediatamente sem esperar pela base de dados
    setPosts(postsAtuais => postsAtuais.map(post => {
      if (post.id === postId) {
        const novosLikes = jaDeuLike
          ? post.likes.filter(l => l.user_id !== session.user.id) // Tira o like localmente
          : [...(post.likes || []), { user_id: session.user.id }]; // Adiciona o like localmente
        return { ...post, likes: novosLikes };
      }
      return post;
    }));

    // 2. Manda a informação para a base de dados nos bastidores
    if (jaDeuLike) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', session.user.id);
    } else {
      await supabase.from('likes').insert([{ post_id: postId, user_id: session.user.id }]);
    }
    
    // 3. Atualiza os dados finais de forma silenciosa para garantir sincronização
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
    <div style={{ padding: '10px', paddingBottom: '90px' }}>
      
      {/* AVISO TOAST NO CENTRO DO ECRÃ */}
      {toast.show && (
        <div 
          className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} 
          style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '90%', maxWidth: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
        >
          {toast.message}
        </div>
      )}

      {/* JANELA DE NOVA PUBLICAÇÃO (MODAL) */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', 
          justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', margin: 0, position: 'relative' }}>
            {/* Botão de Fechar no canto */}
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h3 style={{ margin: '0 0 15px 0' }}>📸 Nova Publicação</h3>
            <form onSubmit={publicarPost}>
              <input
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
                {uploading ? 'A enviar... aguarda ⏳' : 'Publicar no Feed'}
              </button>
            </form>
          </div>
        </div>
      )}

    {/* FEED DE POSTS */}
      {posts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '60px', 
          padding: '30px 20px', 
          background: 'rgba(255, 255, 255, 0.6)', 
          borderRadius: '16px', 
          border: '2px dashed var(--accent)',
          backdropFilter: 'blur(5px)'
        }}>
          <span style={{ fontSize: '45px', display: 'block', marginBottom: '15px' }}>🏜️</span>
          <h3 style={{ color: 'var(--accent)', margin: '0 0 10px 0', fontSize: '22px' }}>O feed está uma seca!</h3>
          <p style={{ color: 'var(--text)', margin: 0, fontWeight: '500', fontSize: '15px' }}>
            Ainda ninguém publicou nada. Clica no botão laranja no fundo do ecrã e arranca com a festa! 🍻
          </p>
        </div>
      ) : (
        posts.map((post) => {
          const jaDeuLike = post.likes?.some((l) => l.user_id === session.user.id);

          return (
            <div key={post.id} className="card">
              <p style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)', fontSize: '15px' }}>
                @{post.profiles?.username || 'Membro'}
              </p>

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
        })
      )}

      {/* BOTÃO FLUTUANTE DE "+" */}
      <button 
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed', bottom: '95px', right: '20px', width: '60px', height: '60px',
          background: 'var(--accent)', color: 'white', borderRadius: '50%',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          border: 'none', boxShadow: '0 4px 15px rgba(249, 115, 22, 0.5)',
          cursor: 'pointer', zIndex: 90
        }}
      >
        <Plus size={32} />
      </button>

    </div>
  );
}