import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Send, Plus, X, Trash2, Edit2, Check, RefreshCw, User } from 'lucide-react';

function formatarTempo(dataIso) {
  if (!dataIso) return '';
  const dataPost = new Date(dataIso);
  const agora = new Date();
  const segundos = Math.floor((agora - dataPost) / 1000);

  if (segundos < 60) return 'agora mesmo';
  
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos}m`;
  
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `há ${dias}d`;
  
  return dataPost.toLocaleDateString('pt-PT');
}

export default function Feed({ session }) {
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  const [editingPostId, setEditingPostId] = useState(null);
  const [editCaptionText, setEditCaptionText] = useState('');

  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  // A MÁGICA DE ATUALIZAR: Atualiza quando abres a app
  useEffect(() => {
    carregarPosts();

    const recarregarSeVisivel = () => {
      if (document.visibilityState === 'visible') {
        carregarPosts();
      }
    };

    document.addEventListener('visibilitychange', recarregarSeVisivel);
    window.addEventListener('focus', recarregarSeVisivel);

    return () => {
      document.removeEventListener('visibilitychange', recarregarSeVisivel);
      window.removeEventListener('focus', recarregarSeVisivel);
    };
  }, []);

  async function carregarPosts() {
    setIsRefreshing(true);
    // VAI BUSCAR POSTS E AS FOTOS DE PERFIL (avatar_url)
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url), likes(user_id), comments(*, profiles(username))')
      .eq('is_disposable', false)
      .order('created_at', { ascending: false });

    if (!error) setPosts(data);
    setIsRefreshing(false);
  }

  // 🚨 ATENÇÃO: Se o teu ficheiro backend não se chamar "notify.js", altera a rota '/api/notify' abaixo!
  async function notificarDono(action, targetUserId) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
        
      const actorName = profile?.username || 'Alguém';

      // CAMINHO RELATIVO: Resolve problemas de CORS e links errados
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          actorName: actorName,
          targetId: targetUserId,
          actingId: session.user.id
        })
      });

      if (!res.ok) {
        console.error("Erro na Vercel ao enviar push:", await res.text());
      }
    } catch (err) {
      console.log("Erro a notificar:", err);
    }
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

      // AVISA A MALTA PELO NOME DE QUEM PUBLICOU O POST (Usando caminho relativo)
      try {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
        const res = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'new_post',
            actorName: profile?.username || 'Alguém',
            actingId: session.user.id
          })
        });

        if (!res.ok) {
          console.error("Erro na Vercel ao avisar novo post:", await res.text());
        }
      } catch (err) {
        console.log("Erro a notificar:", err);
      }

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

  function pedirParaApagar(postId) {
    setPostToDelete(postId);
  }

  async function confirmarApagarPost() {
    const postId = postToDelete;
    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      showToast(`Erro ao apagar: ${error.message}`, 'error');
    } else {
      showToast('Publicação apagada! 🗑️', 'success');
      setPostToDelete(null);
      carregarPosts();
    }
  }

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

  async function toggleLike(postId, jaDeuLike, postOwnerId) {
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
      if (postOwnerId !== session.user.id) {
        notificarDono('like', postOwnerId);
      }
    }
    carregarPosts();
  }

  async function adicionarComentario(postId, postOwnerId) {
    const texto = commentText[postId];
    if (!texto) return;

    await supabase.from('comments').insert([{
      post_id: postId,
      user_id: session.user.id,
      content: texto
    }]);

    setCommentText({ ...commentText, [postId]: '' });
    carregarPosts();

    if (postOwnerId !== session.user.id) {
      notificarDono('comment', postOwnerId);
    }
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

      {/* BOTÃO DE REFRESH MANUAL */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
        <button onClick={carregarPosts} disabled={isRefreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 15px', borderRadius: '20px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <RefreshCw size={16} /> {isRefreshing ? 'A atualizar...' : 'Atualizar Feed'}
        </button>
      </div>

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
          background: 'var(--bg-card)', borderRadius: '16px',
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
          
          const avatar = post.profiles?.avatar_url;

          return (
            <div key={post.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                
                {/* CABEÇALHO DO POST COM FOTO DE PERFIL */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--accent)' }}>
                    {avatar ? (
                      <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={20} color="var(--text-dim)" />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontWeight: 'bold', margin: 0, color: 'var(--text)', fontSize: '15px' }}>
                      @{post.profiles?.username || 'Membro'}
                    </p>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {formatarTempo(post.created_at)}
                    </span>
                  </div>
                </div>

                {/* BOTÕES DE EDITAR E APAGAR */}
                {eMeuPost && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditingPostId(post.id);
                        setEditCaptionText(post.caption || '');
                      }}
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                      title="Editar legenda"
                    >
                      <Edit2 size={16} color="var(--text-dim)" />
                    </button>
                    <button
                      onClick={() => pedirParaApagar(post.id)}
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

              {/* MODO DE EDIÇÃO */}
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
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 10px', cursor: 'pointer' }}
                  >
                    <X size={18} color="var(--text-dim)" />
                  </button>
                </div>
              ) : (
                <p style={{ margin: '12px 0', color: 'var(--text)', fontSize: '14px' }}>{post.caption}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                <button
                  style={{ background: 'none', border: 'none', color: jaDeuLike ? '#ef4444' : 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
                  onClick={() => toggleLike(post.id, jaDeuLike, post.user_id)}
                >
                  <Heart fill={jaDeuLike ? '#ef4444' : 'none'} size={24} />
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text)' }}>{post.likes?.length || 0}</span>
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px' }}>
                {post.comments?.map((c) => (
                  <p key={c.id} style={{ fontSize: '13px', margin: '6px 0', color: 'var(--text)' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>@{c.profiles?.username}: </span>
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
                    onClick={() => adicionarComentario(post.id, post.user_id)}
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

      {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO */}
      {postToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', margin: 0
        }}>
          <div style={{ width: '100%', maxWidth: '320px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '20px', padding: '25px 20px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', boxSizing: 'border-box' }}>
            <div style={{ background: '#fee2e2', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
              <Trash2 size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: 'var(--text)' }}>Apagar Publicação?</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: '0 0 20px 0' }}>
              Isto vai desaparecer para sempre do feed. Tens a certeza absoluta?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setPostToDelete(null)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarApagarPost}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}
              >
                Sim, Apagar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}