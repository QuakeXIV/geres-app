import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import OneSignal from 'react-onesignal';

// Componentes da App
import Auth from './components/Auth';
import Feed from './components/Feed';
import Tasca from './components/Tasca';
import DisposableCamera from './components/DisposableCamera';
import Missoes from './components/Missoes';
import Livro from './components/Livro';
import Estatisticas from './components/Estatisticas';
import Compras from './components/Compras';
import Arena from './components/Arena';
import TutorialInstalacao from './components/TutorialInstalacao';

// Ícones
import { Home, Beer, Target, LogOut, Sun, Moon, BookOpen, BarChart3, ShoppingCart, Camera, Gamepad2, Bell, BellOff, User, Save, MapPin } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'feed';
  });

  const oneSignalInitRef = useRef(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [pushEnabled, setPushEnabled] = useState(false);

  // Estados do Perfil / Menu
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.setAttribute('data-theme', 'dark');
    }
  }, []);

  // CARREGAR O PERFIL
  useEffect(() => {
    if (session?.user?.id) carregarPerfil();
  }, [session]);

  async function carregarPerfil() {
    const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();
    if (data) {
      setUsername(data.username || '');
      setAvatarUrl(data.avatar_url);
    }
  }

  // INICIAR ONESIGNAL
  useEffect(() => {
    if (!session?.user?.id || oneSignalInitRef.current) return;
    oneSignalInitRef.current = true; 

    async function setupOneSignal() {
      try {
        await OneSignal.init({
          appId: "2505560e-8033-4528-997c-eca674fa3230",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false }, 
        });
        
        if (OneSignal.login) await OneSignal.login(session.user.id);
        
        if (OneSignal.User && OneSignal.User.PushSubscription) {
          OneSignal.User.addTag("app_user_id", session.user.id);
          setPushEnabled(OneSignal.User.PushSubscription.optedIn);
        } else if (OneSignal.isPushNotificationsEnabled) {
          OneSignal.sendTag("app_user_id", session.user.id);
          const isEnabled = await OneSignal.isPushNotificationsEnabled();
          setPushEnabled(isEnabled);
        }
      } catch (error) { 
        console.error("Erro crítico no OneSignal:", error); 
      }
    }
    setupOneSignal();
  }, [session]);

  if (!session) return <Auth />;

  // --- FUNÇÕES DO PERFIL ---
  async function atualizarFoto(event) {
    try {
      setUploadingProfile(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Escolhe uma imagem.');
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${session.user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      
      setAvatarUrl(publicUrl);
      showToast('Foto atualizada! 📸', 'success');
    } catch (error) {
      showToast(`Erro: ${error.message}`, 'error');
    } finally {
      setUploadingProfile(false);
    }
  }

  async function atualizarNome(e) {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({ username }).eq('id', session.user.id);
    if (error) showToast(error.message, 'error');
    else showToast('Nome guardado! ✍️', 'success');
  }

  function toggleTheme() {
    const novoTema = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', novoTema);
    document.body.setAttribute('data-theme', novoTema);
  }

  const toggleNotificacoes = async () => {
    try {
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        if (pushEnabled) {
          await OneSignal.User.PushSubscription.optOut();
          setPushEnabled(false); 
          showToast("Notificações desativadas 🔕", "error");
        } else {
          if (OneSignal.Slidedown) await OneSignal.Slidedown.promptPush();
          await OneSignal.User.PushSubscription.optIn();
          setPushEnabled(true); 
          showToast("Notificações ativadas 🔔", "success");
        }
      } else if (OneSignal.isPushNotificationsEnabled) {
        if (pushEnabled) {
          await OneSignal.setSubscription(false);
          setPushEnabled(false);
        } else {
          await OneSignal.showSlidedownPrompt();
          await OneSignal.setSubscription(true);
          setPushEnabled(true);
        }
      }
    } catch (error) { 
      console.error("Erro notificações:", error);
    }
  };

  // NOVO ESTILO DA NAVBAR (Design tipo Dock do iOS)
  const navItemStyle = (isActive) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', 
    padding: '8px 14px', borderRadius: '16px', 
    background: isActive ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
    color: isActive ? 'var(--accent)' : 'var(--text-dim)', 
    border: 'none', cursor: 'pointer', minWidth: '70px',
    transition: 'all 0.3s ease',
  });

  return (
    <div>
      <style>{`
        .scroll-navbar::-webkit-scrollbar { display: none; }
        .scroll-navbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {toast.show && (
        <div style={{
          position: 'fixed', top: 'calc(70px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, width: '90%', maxWidth: '400px',
          background: toast.type === 'error' ? '#ef4444' : 'var(--success)',
          color: 'white', padding: '12px 20px', borderRadius: '12px',
          textAlign: 'center', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      {/* HEADER REDESIGN TOTAL */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        paddingTop: 'calc(15px + env(safe-area-inset-top))', paddingBottom: '15px',
        paddingLeft: '20px', paddingRight: '20px', 
        background: 'var(--bg-card)', backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
        borderBottom: '1px solid var(--border)', position: 'sticky',
        top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        
        {/* Esquerda: Ícone do Sol */}
        <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
          <Sun size={24} color="var(--accent)" />
        </div>

        {/* Meio: Título com Gradiente */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h2 style={{ 
            margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '0.5px',
            background: 'linear-gradient(135deg, #f97316 0%, #f43f5e 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            GERÊS 2K26
          </h2>
        </div>
        
        {/* Direita: Avatar de Perfil (Clicável) */}
        <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-end' }}>
          <div 
            onClick={() => setTab('menu')}
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: tab === 'menu' ? '2px solid var(--accent)' : '2px solid var(--border)', overflow: 'hidden', background: 'var(--bg-main)', cursor: 'pointer', transition: 'border 0.3s' }}
          >
            {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--text-dim)" style={{ margin: '6px' }} />}
          </div>
        </div>

      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={{ paddingBottom: '100px' }}>
        {tab === 'feed' && <Feed session={session} />}
        {tab === 'tasca' && <Tasca session={session} />}
        {tab === 'missoes' && <Missoes session={session} />}
        {tab === 'livro' && <Livro session={session} />}
        {tab === 'stats' && <Estatisticas />}
        {tab === 'compras' && <Compras session={session} />}
        {tab === 'camera' && <DisposableCamera session={session} />}
        {tab === 'arena' && <Arena session={session} />}
        
        {/* MENU (PERFIL E DEFINIÇÕES) */}
        {tab === 'menu' && (
          <div style={{ padding: '15px' }}>
            
            <div className="card" style={{ textAlign: 'center', padding: '30px 20px', marginTop: '10px' }}>
              <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 20px auto' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-main)', border: '4px solid var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={50} color="var(--text-dim)" />}
                </div>
                <label style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--accent)', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
                  <Camera size={18} />
                  <input type="file" accept="image/*" onChange={atualizarFoto} disabled={uploadingProfile} style={{ display: 'none' }} />
                </label>
              </div>
              
              {uploadingProfile && <p style={{ fontSize: '12px', color: 'var(--accent)', margin: '0 0 10px 0' }}>A enviar foto...</p>}

              <form onSubmit={atualizarNome}>
                <input 
                  className="input-field" type="text" value={username} onChange={(e) => setUsername(e.target.value)} 
                  placeholder="O teu nome" required style={{ textAlign: 'center', fontWeight: 'bold' }}
                />
                <button className="btn-primary" style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '10px 0 0 0' }}>
                  <Save size={18} /> Atualizar Perfil
                </button>
              </form>
            </div>

            <h3 style={{ margin: '25px 0 10px 5px', fontSize: '13px', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ⚙️ Definições da App
            </h3>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div onClick={toggleTheme} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: isDarkMode ? '#334155' : '#fef08a', padding: '10px', borderRadius: '10px' }}>
                    {isDarkMode ? <Moon size={20} color="#94a3b8" /> : <Sun size={20} color="#eab308" />}
                  </div>
                  <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>Modo Escuro</span>
                </div>
                <div style={{ width: '50px', height: '28px', background: isDarkMode ? 'var(--accent)' : '#cbd5e1', borderRadius: '30px', position: 'relative', transition: 'background 0.3s' }}>
                  <div style={{ width: '22px', height: '22px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: isDarkMode ? '25px' : '3px', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                </div>
              </div>

              <div onClick={toggleNotificacoes} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: pushEnabled ? '#dcfce7' : '#fee2e2', padding: '10px', borderRadius: '10px' }}>
                    {pushEnabled ? <Bell size={20} color="#16a34a" /> : <BellOff size={20} color="#dc2626" />}
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: 'var(--text)', display: 'block' }}>Notificações</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{pushEnabled ? 'Ativadas' : 'Desativadas'}</span>
                  </div>
                </div>
                <div style={{ width: '50px', height: '28px', background: pushEnabled ? '#22c55e' : '#ef4444', borderRadius: '30px', position: 'relative', transition: 'background 0.3s' }}>
                  <div style={{ width: '22px', height: '22px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: pushEnabled ? '25px' : '3px', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                </div>
              </div>
            </div>

            <button onClick={() => supabase.auth.signOut()} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '100%', padding: '16px', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '30px', cursor: 'pointer' }}>
              <LogOut size={20} /> Terminar Sessão
            </button>

          </div>
        )}
      </div>

      {/* A NOVA NAVBAR HORIZONTAL - TIPO DOCK MODERNO */}
      <div style={{
        position: 'fixed', bottom: 'max(15px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
        width: '95%', maxWidth: '450px', background: 'var(--bg-card)', 
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        border: '1px solid var(--border)', zIndex: 1000, overflow: 'hidden'
      }}>
        <div className="scroll-navbar" style={{
          display: 'flex', overflowX: 'auto', gap: '5px', padding: '10px 15px', 
          WebkitOverflowScrolling: 'touch', alignItems: 'center'
        }}>
          
          <button style={navItemStyle(tab === 'feed')} onClick={() => setTab('feed')}>
            <Home size={22} />
            <span style={{ fontSize: '10px' }}>Feed</span>
          </button>
          
          <button style={navItemStyle(tab === 'tasca')} onClick={() => setTab('tasca')}>
            <Beer size={22} />
            <span style={{ fontSize: '10px' }}>Tasca</span>
          </button>
          
          <button style={navItemStyle(tab === 'missoes')} onClick={() => setTab('missoes')}>
            <Target size={22} />
            <span style={{ fontSize: '10px' }}>Missões</span>
          </button>

          <button style={navItemStyle(tab === 'arena')} onClick={() => setTab('arena')}>
            <Gamepad2 size={22} />
            <span style={{ fontSize: '10px' }}>Arena</span>
          </button>

          <button style={navItemStyle(tab === 'compras')} onClick={() => setTab('compras')}>
            <ShoppingCart size={22} />
            <span style={{ fontSize: '10px' }}>Radar</span>
          </button>

          <button style={navItemStyle(tab === 'livro')} onClick={() => setTab('livro')}>
            <BookOpen size={22} />
            <span style={{ fontSize: '10px' }}>Livro</span>
          </button>

          <button style={navItemStyle(tab === 'camera')} onClick={() => setTab('camera')}>
            <Camera size={22} />
            <span style={{ fontSize: '10px' }}>Câmara</span>
          </button>

          <button style={navItemStyle(tab === 'stats')} onClick={() => setTab('stats')}>
            <BarChart3 size={22} />
            <span style={{ fontSize: '10px' }}>Stats</span>
          </button>

        </div>
      </div>

      <TutorialInstalacao />
    </div>
  );
}