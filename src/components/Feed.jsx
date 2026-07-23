import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Send, Plus, X, Trash2, Edit2, Check } from 'lucide-react';

export default function Feed({ session }) {
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ESTADOS PARA EDITAR POSTS
  const [editingPostId, setEditingPostId] = useState(null);
  const [editCaptionText, setEditCaptionText] = useState('');

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

      showToast('Publicado com sucesso! 🚀', 'success');
      setCaption('');
      setFile(null);
      setIsModalOpen(false);
      carregarPosts();
      
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  // APAGAR POST
  async function apagarPost(postId) {
    if (!window.confirm('Tens a certeza que queres apagar esta publicação?')) return;

    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      showToast(`Erro ao apagar: ${error.message}`, 'error');
    } else {
      showToast('Publicação apagada! 🗑️', 'success');
      carregarPosts();
    }
  }

  // GUARDAR EDIÇÃO DA LEGENDA
  async function guardarEdicao(postId) {
    const { error } = await supabase
      .from('posts')
      .update({ caption: editCaptionText })
      .eq('id', postId);

    if (error) {
      showToast(`Erro ao atualizar: ${error.message}`, 'error');
    } else {
      showToast('Legenda atualizada! ✏️', 'success');
      setEditingPostId(null);
      carregarPosts();
    }
  }

  async function toggleLike(postId, jaDeuLike) {
    setPosts(postsAtuais => postsAtuais.map(post => {
      if (post.id === postId) {
        const novosLikes = jaDeuLike
          ? post.likes.filter(l => l.user_id !== session.user.id)
          : [...(post.likes || []), { user_id: session.user.id }];
        return { ...post, likes: novosLikes };
      }
      return post;
    }));

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
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      {toast.show && (
        <div 
          className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} 
          style={{ position: 'fixed', top: 'calc(60px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '90%', maxWidth: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
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
          textAlign: 'center', marginTop: '60px', padding: '30px 20px', 
          background: 'rgba(255, 255, 255, 0.6)', borderRadius: '16px', 
          border: '2px dashed var(--accent)', backdropFilter: 'blur(5px)'
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
          const eMeuPost = post.user_id === session.user.id;
          const aEditar = editingPostId === post.id;

          return (
            <div key={post.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p style={{ fontWeight: 'bold', margin: 0, color: 'var(--accent)', fontSize: '15px' }}>
                  @{post.profiles?.username || 'Membro'}
                </p>

                {/* BOTÕES DE EDITAR E APAGAR (APENAS PARA O DONO DO POST) */}
                {eMeuPost && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => {
                        setEditingPostId(post.id);
                        setEditCaptionText(post.caption || '');
                      }} 
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                      title="Editar legenda"
                    >
                      <Edit2 size={16} color="var(--text-dim)" />
                    </button>
                    <button 
                      onClick={() => apagarPost(post.id)} 
                      style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                      title="Apagar post"
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </div>
                )}
              </div>

              {post.media_type === 'video' ? (
                <video src={post.media_url} controls playsInline style={{ width: '100%', borderRadius: '12px' }} />
              ) : (
                <img src={post.media_url} alt="Media" style={{ width: '100%', borderRadius: '12px' }} />
              )}

              {/* MODO DE EDIÇÃO DA LEGENDA OU LEGENDA NORMAL */}
              {aEditar ? (
                <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
                  <input
                    className="input-field"
                    style={{ margin: 0, padding: '8px 12px', fontSize: '14px' }}
                    type="text"
                    value={editCaptionText}
                    onChange={(e) => setEditCaptionText(e.target.value)}
                  />
                  <button 
                    onClick={() => guardarEdicao(post.id)}
                    style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer' }}
                  >
                    <Check size={18} color="white" />
                  </button>
                  <button 
                    onClick={() => setEditingPostId(null)}
                    style={{ background: '#cbd5e1', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: 'pointer' }}
                  >
                    <X size={18} color="#334155" />
                  </button>
                </div>
              ) : (
                <p style={{ margin: '12px 0', color: 'var(--text)', fontSize: '14px' }}>{post.caption}</p>
              )}

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
          position: 'fixed', bottom: 'calc(100px + env(safe-area-inset-bottom))', right: '20px', width: '60px', height: '60px',
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