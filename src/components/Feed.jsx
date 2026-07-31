import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Send, Plus, X, Trash2, Edit2, Check, RefreshCw, User, Camera } from 'lucide-react';

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
  const [groupedStories, setGroupedStories] = useState([]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  const [editingPostId, setEditingPostId] = useState(null);
  const [editCaptionText, setEditCaptionText] = useState('');

  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Story Viewer State
  const [activeStoryUser, setActiveStoryUser] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // Memória de stories vistos
  const [seenStories, setSeenStories] = useState([]);

  // --- NOVOS ESTADOS PARA AUTO-COMPLETE DE MENÇÕES ---
  const [allUsers, setAllUsers] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(0);
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  useEffect(() => {
    // Carrega os vistos da memória do telemóvel ao abrir
    const vistosGuardados = localStorage.getItem('seenStories_geres');
    if (vistosGuardados) {
      setSeenStories(JSON.parse(vistosGuardados));
    }
    
    carregarTudo();

    const recarregarSeVisivel = () => {
      if (document.visibilityState === 'visible') {
        carregarTudo();
      }
    };

    document.addEventListener('visibilitychange', recarregarSeVisivel);
    window.addEventListener('focus', recarregarSeVisivel);

    return () => {
      document.removeEventListener('visibilitychange', recarregarSeVisivel);
      window.removeEventListener('focus', recarregarSeVisivel);
    };
  }, []);

  // Marca o story como visto automaticamente mal aparece no ecrã
  useEffect(() => {
    if (activeStoryUser && activeStoryUser.items[currentStoryIndex]) {
      const storyAtualId = activeStoryUser.items[currentStoryIndex].id;
      setSeenStories(prev => {
        if (prev.includes(storyAtualId)) return prev; // já estava visto
        const novosVistos = [...prev, storyAtualId];
        localStorage.setItem('seenStories_geres', JSON.stringify(novosVistos));
        return novosVistos;
      });
    }
  }, [activeStoryUser, currentStoryIndex]);

  async function carregarTudo() {
    setIsRefreshing(true);
    await Promise.all([carregarPosts(), carregarStories(), carregarTodosUsuarios()]);
    setIsRefreshing(false);
  }

  // Vai buscar toda a malta para podermos sugerir os nomes
  async function carregarTodosUsuarios() {
    const { data } = await supabase.from('profiles').select('id, username, avatar_url');
    if (data) setAllUsers(data);
  }

  async function carregarPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url), likes(user_id), comments(*, profiles(username))')
      .eq('is_disposable', false)
      .order('created_at', { ascending: false });

    if (!error) setPosts(data);
  }

  async function carregarStories() {
    const limite24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('stories')
      .select('*, profiles(username, avatar_url)')
      .gt('created_at', limite24h)
      .order('created_at', { ascending: true }); // Os mais antigos primeiro na lista para o carrossel

    if (!error && data) {
      const grupos = {};
      data.forEach(story => {
        const userId = story.user_id;
        if (!grupos[userId]) {
          grupos[userId] = {
            userId: userId,
            username: story.profiles?.username || 'Membro',
            avatar: story.profiles?.avatar_url,
            items: []
          };
        }
        grupos[userId].items.push(story);
      });

      let sortedGroups = Object.values(grupos);
      const myIndex = sortedGroups.findIndex(g => g.userId === session.user.id);
      if (myIndex > -1) {
        const myGroup = sortedGroups.splice(myIndex, 1)[0];
        sortedGroups.unshift(myGroup);
      }

      setGroupedStories(sortedGroups);
    }
  }

  // --- LÓGICA DE AUTO-COMPLETE DE MENÇÕES (MODAL POST/STORY) ---
  function handleCaptionChange(e) {
    const value = e.target.value;
    setCaption(value);

    // Detetar se estamos a escrever uma menção
    const cursor = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const words = textBeforeCursor.split(/\s/);
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith('@')) {
      const searchText = currentWord.slice(1).toLowerCase();
      const filtered = allUsers.filter(u => 
        u.username && u.username.toLowerCase().includes(searchText)
      );
      setMentionSuggestions(filtered);
      setShowSuggestions(true);
      setMentionStartIndex(cursor - currentWord.length);
      setActiveCommentPostId(null); // Garante que a box só abre no modal
    } else {
      setShowSuggestions(false);
    }
  }

  function selecionarMencao(username) {
    const textBefore = caption.slice(0, mentionStartIndex);
    const textAfterTemp = caption.slice(mentionStartIndex);
    const nextSpace = textAfterTemp.indexOf(' ');
    const textAfter = nextSpace === -1 ? '' : textAfterTemp.slice(nextSpace);
    
    setCaption(`${textBefore}@${username} ${textAfter}`);
    setShowSuggestions(false);
  }

  // --- LÓGICA DE AUTO-COMPLETE DE MENÇÕES (COMENTÁRIOS NO FEED) ---
  function handleCommentChange(e, postId) {
    const value = e.target.value;
    setCommentText({ ...commentText, [postId]: value });

    const cursor = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const words = textBeforeCursor.split(/\s/);
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith('@')) {
      const searchText = currentWord.slice(1).toLowerCase();
      const filtered = allUsers.filter(u => 
        u.username && u.username.toLowerCase().includes(searchText)
      );
      setMentionSuggestions(filtered);
      setShowSuggestions(true);
      setMentionStartIndex(cursor - currentWord.length);
      setActiveCommentPostId(postId); // Marca que o dropdown é para este comentário
    } else {
      setShowSuggestions(false);
      setActiveCommentPostId(null);
    }
  }

  function selecionarMencaoComentario(username, postId) {
    const text = commentText[postId] || '';
    const textBefore = text.slice(0, mentionStartIndex);
    const textAfterTemp = text.slice(mentionStartIndex);
    const nextSpace = textAfterTemp.indexOf(' ');
    const textAfter = nextSpace === -1 ? '' : textAfterTemp.slice(nextSpace);
    
    setCommentText({ ...commentText, [postId]: `${textBefore}@${username} ${textAfter}` });
    setShowSuggestions(false);
    setActiveCommentPostId(null);
  }

  // --- DETETOR DE MENÇÕES PARA NOTIFICAR (BACKEND) ---
  const extrairMencoes = (texto) => {
    if (!texto) return [];
    const regex = /@([a-zA-Z0-9_]+)/g;
    const mencoes = [];
    let match;
    while ((match = regex.exec(texto)) !== null) {
      mencoes.push(match[1]); // Guarda só o nome
    }
    return [...new Set(mencoes)];
  };

  async function notificarMentions(texto, actorName) {
    const usernames = extrairMencoes(texto);
    if (usernames.length === 0) return;

    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .in('username', usernames);

    if (users) {
      for (const u of users) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mention', actorName, targetId: u.id, actingId: session.user.id })
        });
      }
    }
  }

  async function notificarAcao(action, targetUserId = null) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();

      const actorName = profile?.username || 'Alguém';

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

      if (!res.ok) console.error("Erro na Vercel ao enviar push:", await res.text());
      return actorName;
    } catch (err) {
      console.log("Erro a notificar:", err);
      return 'Alguém';
    }
  }

  async function publicar(e) {
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

      if (isStoryMode) {
        const { error: dbError } = await supabase.from('stories').insert([{
          user_id: session.user.id,
          media_url: publicUrl,
          media_type: isVideo ? 'video' : 'image',
          caption
        }]);

        if (dbError) throw new Error(`Erro BD: ${dbError.message}`);

        const actorName = await notificarAcao('new_story');
        await notificarMentions(caption, actorName);
        showToast('Story adicionado com sucesso! 📸', 'success');

      } else {
        const { error: dbError } = await supabase.from('posts').insert([{
          user_id: session.user.id,
          media_url: publicUrl,
          media_type: isVideo ? 'video' : 'image',
          caption,
          is_disposable: false
        }]);

        if (dbError) throw new Error(`Erro BD: ${dbError.message}`);

        const actorName = await notificarAcao('new_post');
        await notificarMentions(caption, actorName);
        showToast('Publicado com sucesso! 🚀', 'success');
      }

      setCaption('');
      setFile(null);
      setIsModalOpen(false);
      carregarTudo();

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  // Lógica de navegação de Stories
  function abrirStory(userGroup) {
    setActiveStoryUser(userGroup);
    setCurrentStoryIndex(0);
  }

  function nextStory() {
    if (currentStoryIndex < activeStoryUser.items.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      setActiveStoryUser(null);
    }
  }

  function prevStory() {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
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

  async function apagarStory(storyId) {
    const confirmacao = window.confirm("Tens a certeza que queres apagar este story?");
    if (!confirmacao) return;

    const { error } = await supabase.from('stories').delete().eq('id', storyId);

    if (error) {
      showToast(`Erro ao apagar: ${error.message}`, 'error');
    } else {
      showToast('Story apagado! 🗑️', 'success');
      setActiveStoryUser(null);
      carregarStories();
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
        notificarAcao('like', postOwnerId);
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
      const actorName = await notificarAcao('comment', postOwnerId);
      await notificarMentions(texto, actorName);
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

      {/* BARRA SUPERIOR: TÍTULO E REFRESH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Feed
        </h2>
        <button onClick={carregarTudo} disabled={isRefreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '20px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <RefreshCw size={14} className={isRefreshing ? "spin" : ""} /> {isRefreshing ? 'A atualizar...' : 'Atualizar'}
        </button>
      </div>

      {/* BARRA DE STORIES ESTILO INSTAGRAM */}
      <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px', marginBottom: '15px', borderBottom: '1px solid var(--border)' }}>

        {/* BOTÃO ADICIONAR STORY */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px', cursor: 'pointer' }} onClick={() => { setIsStoryMode(true); setIsModalOpen(true); }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--text-dim)', position: 'relative' }}>
            <Plus size={24} color="var(--text-dim)" />
            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: 'var(--accent)', borderRadius: '50%', border: '2px solid var(--bg-card)', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={14} color="white" />
            </div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '5px' }}>O Teu Story</span>
        </div>

        {/* LISTA DE STORIES ATIVOS */}
        {groupedStories.map(group => {
          const todosVistos = group.items.every(story => seenStories.includes(story.id));
          const corArgola = todosVistos ? 'rgba(255, 255, 255, 0.15)' : 'linear-gradient(45deg, #f97316, #fbbf24)';
          const opacidadeNome = todosVistos ? 0.5 : 1;

          return (
            <div key={group.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px', cursor: 'pointer' }} onClick={() => abrirStory(group)}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', padding: '3px', background: corArgola, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-card)', border: '2px solid var(--bg-card)' }}>
                  {group.avatar ? (
                    <img src={group.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={24} color="var(--text-dim)" />
                    </div>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text)', opacity: opacidadeNome, marginTop: '5px', fontWeight: group.userId === session.user.id ? 'bold' : 'normal' }}>
                {group.userId === session.user.id ? 'Tu' : group.username}
              </span>
            </div>
          );
        })}
      </div>

      {/* STORY VIEWER (FULLSCREEN) */}
      {activeStoryUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'black', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
          
          {/* 1. BARRA DE PROGRESSO TIPO INSTA */}
          <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', left: '10px', right: '10px', display: 'flex', gap: '4px', zIndex: 20 }}>
            {activeStoryUser.items.map((_, idx) => (
              <div key={idx} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: 'white',
                  width: idx <= currentStoryIndex ? '100%' : '0%',
                  transition: 'width 0.2s ease-in-out'
                }}></div>
              </div>
            ))}
          </div>

          {/* 2. CABEÇALHO DO STORY */}
          <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 15px)', left: 0, width: '100%', padding: '0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1px solid white' }}>
                {activeStoryUser.avatar ? <img src={activeStoryUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <User color="white"/>}
              </div>
              <span style={{ color: 'white', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>@{activeStoryUser.username}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {formatarTempo(activeStoryUser.items[currentStoryIndex].created_at)}
              </span>
            </div>
            
            {/* BOTÕES DE APAGAR E FECHAR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {activeStoryUser.userId === session.user.id && (
                <button onClick={() => apagarStory(activeStoryUser.items[currentStoryIndex].id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}>
                  <Trash2 size={24} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                </button>
              )}
              <button onClick={() => setActiveStoryUser(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '5px' }}>
                <X size={28} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
              </button>
            </div>
          </div>

          {/* 3. ÁREA DE TOQUE (Esquerda/Direita) */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', zIndex: 5 }}>
            <div style={{ flex: 1 }} onClick={prevStory}></div>
            <div style={{ flex: 1 }} onClick={nextStory}></div>
          </div>

          {/* 4. IMAGEM OU VÍDEO */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            {activeStoryUser.items[currentStoryIndex].media_type === 'video' ? (
              <video src={activeStoryUser.items[currentStoryIndex].media_url} autoPlay playsInline loop style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <img src={activeStoryUser.items[currentStoryIndex].media_url} alt="Story" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            )}

            {/* 5. LEGENDA */}
            {activeStoryUser.items[currentStoryIndex].caption && (
              <div style={{ position: 'absolute', bottom: '100px', left: '20px', right: '20px', textAlign: 'center', zIndex: 10 }}>
                <span style={{ background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 16px', borderRadius: '12px', fontSize: '16px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {activeStoryUser.items[currentStoryIndex].caption}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JANELA DE NOVA PUBLICAÇÃO (MODAL UNIFICADO FEED/STORY) */}
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

            <h3 style={{ margin: '0 0 5px 0' }}>{isStoryMode ? '📸 Novo Story' : '🚀 Novo Post'}</h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: 'var(--text-dim)' }}>
              Usa <strong style={{ color: 'var(--accent)' }}>@nome</strong> para notificar alguém diretamente!
            </p>

            <form onSubmit={publicar}>
              <input
                className="input-field"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ padding: '10px' }}
              />
              
              <div style={{ position: 'relative' }}>
                {/* DROPDOWN DE SUGESTÕES (CRIAR POST/STORY) */}
                {showSuggestions && !activeCommentPostId && mentionSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: 0, width: '100%', 
                    background: 'var(--bg-card)', border: '1px solid var(--border)', 
                    borderRadius: '12px', maxHeight: '150px', overflowY: 'auto', 
                    zIndex: 10, boxShadow: '0 -4px 10px rgba(0,0,0,0.1)', marginBottom: '5px'
                  }}>
                    {mentionSuggestions.map(u => (
                      <div key={u.id} onClick={() => selecionarMencao(u.username)} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
                        borderBottom: '1px solid var(--border)', cursor: 'pointer'
                      }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', background: 'var(--input-bg)' }}>
                          {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={16} color="var(--text-dim)" style={{ margin: '4px' }} />}
                        </div>
                        <span style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '14px' }}>{u.username}</span>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  className="input-field"
                  type="text"
                  placeholder={isStoryMode ? "Escreve algo para o story..." : "Escreve uma legenda..."}
                  value={caption}
                  onChange={handleCaptionChange}
                />
              </div>

              <button className="btn-primary" disabled={uploading} style={{ background: isStoryMode ? 'linear-gradient(45deg, #f97316, #fbbf24)' : 'var(--accent)' }}>
                {uploading ? 'A enviar... aguarda ⏳' : (isStoryMode ? 'Adicionar ao Story' : 'Publicar no Feed')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FEED DE POSTS */}
      {posts.length === 0 ? (
        <div style={{
          textAlign: 'center', marginTop: '40px', padding: '30px 20px',
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

                <div style={{ position: 'relative', marginTop: '12px' }}>
                  {/* DROPDOWN DE SUGESTÕES (COMENTÁRIOS NO FEED) */}
                  {showSuggestions && activeCommentPostId === post.id && mentionSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: 0, width: '100%',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: '12px', maxHeight: '150px', overflowY: 'auto',
                      zIndex: 10, boxShadow: '0 -4px 10px rgba(0,0,0,0.2)', marginBottom: '5px'
                    }}>
                      {mentionSuggestions.map(u => (
                        <div key={u.id} onClick={() => selecionarMencaoComentario(u.username, post.id)} style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
                          borderBottom: '1px solid var(--border)', cursor: 'pointer'
                        }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', background: 'var(--input-bg)' }}>
                            {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={16} color="var(--text-dim)" style={{ margin: '4px' }} />}
                          </div>
                          <span style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '14px' }}>{u.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '14px', margin: 0 }}
                      type="text"
                      placeholder="Comentar ou mencionar (@)..."
                      value={commentText[post.id] || ''}
                      onChange={(e) => handleCommentChange(e, post.id)}
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
            </div>
          );
        })
      )}

      {/* BOTÃO FLUTUANTE DE "+" PARA FEED */}
      <button
        onClick={() => { setIsStoryMode(false); setIsModalOpen(true); }}
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

      {/* MODAL DE CONFIRMAÇÃO PARA APAGAR POSTS */}
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