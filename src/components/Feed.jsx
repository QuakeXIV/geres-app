import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, MessageCircle, Send, Image } from 'lucide-react';

export default function Feed({ session }) {
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState({});

  useEffect(() => {
    carregarPosts();
  }, []);

  async function carregarPosts() {
    // Carrega posts normais (que não são da câmara descartável)
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username), likes(user_id), comments(*, profiles(username))')
      .eq('is_disposable', false)
      .order('created_at', { ascending: false });

    if (!error) setPosts(data);
  }

  async function publicarPost(e) {
    e.preventDefault();
    if (!file) return alert('Escolhe uma foto ou vídeo!');
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // 1. Upload do ficheiro para o Storage
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file);

    if (uploadError) {
      alert(uploadError.message);
      setUploading(false);
      return;
    }

    // 2. Obter URL público
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

    // 3. Inserir na tabela
    await supabase.from('posts').insert([{
      user_id: session.user.id,
      media_url: publicUrl,
      media_type: file.type.startsWith('video') ? 'video' : 'image',
      caption,
      is_disposable: false
    }]);

    setCaption('');
    setFile(null);
    setUploading(false);
    carregarPosts();
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
      {/* Formulário de Publicação */}
      <div className="card">
        <h3>📸 Publicar no Feed</h3>
        <form onSubmit={publicarPost}>
          <input
            className="input-field"
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <input
            className="input-field"
            type="text"
            placeholder="Escreve uma legenda..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button className="btn-primary" disabled={uploading}>
            {uploading ? 'A carregar...' : 'Publicar'}
          </button>
        </form>
      </div>

      {/* Lista de Publicações */}
      {posts.map((post) => {
        const jaDeuLike = post.likes?.some((l) => l.user_id === session.user.id);

        return (
          <div key={post.id} className="card">
            <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              @{post.profiles?.username || 'Membro'}
            </p>

            {post.media_type === 'image' ? (
              <img src={post.media_url} alt="Media" style={{ width: '100%', borderRadius: '8px' }} />
            ) : (
              <video src={post.media_url} controls style={{ width: '100%', borderRadius: '8px' }} />
            )}

            <p style={{ margin: '8px 0' }}>{post.caption}</p>

            {/* Ações de Like */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '10px 0' }}>
              <button
                style={{ background: 'none', border: 'none', color: jaDeuLike ? '#ef4444' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={() => toggleLike(post.id, jaDeuLike)}
              >
                <Heart fill={jaDeuLike ? '#ef4444' : 'none'} size={20} />
                <span>{post.likes?.length || 0}</span>
              </button>
            </div>

            {/* Comentários */}
            <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px' }}>
              {post.comments?.map((c) => (
                <p key={c.id} style={{ fontSize: '13px', margin: '4px 0' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>@{c.profiles?.username}: </span>
                  {c.content}
                </p>
              ))}

              <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                <input
                  className="input-field"
                  style={{ padding: '6px', fontSize: '12px', margin: 0 }}
                  type="text"
                  placeholder="Comentar..."
                  value={commentText[post.id] || ''}
                  onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                />
                <button
                  style={{ background: 'var(--accent)', border: 'none', borderRadius: '6px', padding: '0 10px', cursor: 'pointer' }}
                  onClick={() => adicionarComentario(post.id)}
                >
                  <Send size={14} color="black" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}