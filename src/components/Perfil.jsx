import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Camera, Moon, Sun, Save, LogOut } from 'lucide-react';

export default function Perfil({ session }) {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    carregarPerfil();
    
    // Verifica qual é o tema atual guardado no telemóvel
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.setAttribute('data-theme', 'dark');
    }
  }, []);

  async function carregarPerfil() {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', session.user.id)
      .single();

    if (!error && data) {
      setUsername(data.username || '');
      setAvatarUrl(data.avatar_url);
    }
  }

  async function atualizarFoto(event) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Deves selecionar uma imagem.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${session.user.id}-${Math.random()}.${fileExt}`;

      // Envia para o storage (pasta media ou cria uma pasta avatars no teu bucket)
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

      // Atualiza a tabela profiles
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      
      setAvatarUrl(publicUrl);
      alert('Foto de perfil atualizada com sucesso!');
    } catch (error) {
      alert(`Erro a enviar foto: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function atualizarNome(e) {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({ username }).eq('id', session.user.id);
    if (error) alert(error.message);
    else alert('Nome atualizado!');
  }

  function toggleTheme() {
    const novoTema = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', novoTema);
    document.body.setAttribute('data-theme', novoTema);
  }

  return (
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white' }}>
        <h2 style={{ margin: '0 0 5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <User size={26} /> O Meu Perfil
        </h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Deixa a tua marca na viagem.</p>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        {/* AVATAR CIRCULAR COM BOTÃO DE UPLOAD */}
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 20px auto' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-main)', border: '4px solid var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={60} color="var(--text-dim)" />
            )}
          </div>
          
          <label style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--accent)', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
            <Camera size={18} />
            <input type="file" accept="image/*" onChange={atualizarFoto} disabled={uploading} style={{ display: 'none' }} />
          </label>
        </div>
        
        {uploading && <p style={{ fontSize: '12px', color: 'var(--accent)' }}>A enviar foto...</p>}

        <form onSubmit={atualizarNome} style={{ marginTop: '15px' }}>
          <label style={{ display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-dim)', marginBottom: '5px' }}>NOME DE UTILIZADOR</label>
          <input 
            className="input-field" 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
          <button className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <Save size={18} /> Guardar Perfil
          </button>
        </form>
      </div>

      {/* DEFINIÇÕES DA APP (MODO ESCURO) */}
      <div className="card">
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Definições da App
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isDarkMode ? <Moon size={22} color="var(--accent)" /> : <Sun size={22} color="#eab308" />}
            <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>Modo Escuro</span>
          </div>
          
          <button 
            onClick={toggleTheme}
            style={{ width: '50px', height: '28px', background: isDarkMode ? 'var(--accent)' : '#cbd5e1', borderRadius: '30px', position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }}
          >
            <div style={{ width: '22px', height: '22px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: isDarkMode ? '25px' : '3px', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', cursor: 'pointer' }}>
          <LogOut size={18} /> Terminar Sessão
        </button>
      </div>

    </div>
  );
}