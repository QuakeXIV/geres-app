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
import { Home, Beer, Target, LogOut, Sun, Moon, BookOpen, BarChart3, ShoppingCart, Camera, Gamepad2, Bell, BellOff, User, Save, Menu, X } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'feed';
  });

  // ESTADO DA GAVETA MÁGICA
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const oneSignalInitRef = useRef(false);
  const [isOneSignalReady, setIsOneSignalReady] = useState(false); // NOVO ESTADO DE SEGURANÇA
  
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

  // 1. INICIAR O ONESIGNAL SEMPRE (Garantindo que termina antes de avançar)
  useEffect(() => {
    if (oneSignalInitRef.current) return;
    oneSignalInitRef.current = true; 

    async function setupOneSignal() {
      try {
        await OneSignal.init({
          appId: "2505560e-8033-4528-997c-eca674fa3230",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false }, 
        });
        
        setIsOneSignalReady(true); // Só agora é que abrimos a "porta" para o Login
        
      } catch (error) { 
        console.error("Erro crítico na inicialização do OneSignal:", error); 
      }
    }
    setupOneSignal();
  }, []);

  // 2. ASSOCIAR O UTILIZADOR E A TAG (Só avança se houver sessão E o OneSignal já estiver Ready)
  useEffect(() => {
    if (isOneSignalReady && session?.user?.id) {
      try {
        OneSignal.login(session.user.id);
        
        if (OneSignal.User) {
          OneSignal.User.addTag("app_user_id", session.user.id);
          
          if (OneSignal.User.PushSubscription) {
            setPushEnabled(OneSignal.User.PushSubscription.optedIn);
          }
        } else {
          OneSignal.sendTag("app_user_id", session.user.id);
        }
      } catch (err) {
        console.error("Erro a associar a Tag do utilizador:", err);
      }
    }
  }, [isOneSignalReady, session]);

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
          showToast("Notificações desativadas 🔕", "error");
        } else {
          await OneSignal.showSlidedownPrompt();
          await OneSignal.setSubscription(true);
          setPushEnabled(true);
          showToast("Notificações ativadas 🔔", "success");
        }
      }
    } catch (error) { 
      console.error("Erro notificações:", error);
    }
  };

  function goToTab(tabName) {
    setTab(tabName);
    setIsMenuOpen(false);
  }

  // --- LÓGICA DE SCROLL FORÇADA (INSTAGRAM STYLE) ---
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0; // Força no Android
    document.body.scrollTop = 0; // Força no iOS/Safari
  }

  function handleFeedClick() {
    if (tab === 'feed' && !isMenuOpen) {
      scrollToTop();
    } else {
      goToTab('feed');
    }
  }

  function handleHeaderClick() {
    if (tab === 'feed') {
      scrollToTop();
    } else {
      goToTab('feed');
      setTimeout(() => scrollToTop(), 100);
    }
  }

  // ESTILOS DA NAVBAR - 5 Botões (20% de largura cada)
  const navItemStyle = (isActive) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', 
    padding: '8px 0', width: '20%',
    color: isActive ? 'var(--accent)' : 'var(--text-dim)', 
    border: 'none', cursor: 'pointer', background: 'transparent',
    transition: 'all 0.3s ease',
  });

  return (
    <div>
      <style>{`
        @keyframes slideUpDrawer {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
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

      {/* HEADER REDESIGN */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        paddingTop: 'calc(15px + env(safe-area-inset-top))', paddingBottom: '15px',
        paddingLeft: '20px', paddingRight: '20px', 
        background: 'var(--bg-card)', backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
        borderBottom: '1px solid var(--border)', position: 'sticky',
        top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
          <Sun size={24} color="var(--accent)" />
        </div>

        {/* CLICAR NO TÍTULO FAZ SCROLL PARA CIMA */}
        <div style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }} onClick={handleHeaderClick}>
          <h2 style={{ 
            margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '0.5px',
            background: 'linear-gradient(135deg, #f97316 0%, #f43f5e 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            GERÊS 2K26
          </h2>
        </div>
        
        <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-end' }}>
          <div 
            onClick={() => setIsMenuOpen(true)}
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--border)', overflow: 'hidden', background: 'var(--bg-main)', cursor: 'pointer', transition: 'border 0.3s' }}
          >
            {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--text-dim)" style={{ margin: '6px' }} />}
          </div>
        </div>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div>
        {tab === 'feed' && <Feed session={session} />}
        {tab === 'tasca' && <Tasca session={session} />}
        {tab === 'missoes' && <Missoes session={session} />}
        {tab === 'livro' && <Livro session={session} />}
        {tab === 'stats' && <Estatisticas />}
        {tab === 'compras' && <Compras session={session} />}
        {tab === 'camera' && <DisposableCamera session={session} />}
        {tab === 'arena' && <Arena session={session} />}
      </div>

      {/* GAVETA MÁGICA (BOTTOM SHEET) */}
      {isMenuOpen && (
        <>
          <div 
            onClick={() => setIsMenuOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 998, animation: 'fadeInBackdrop 0.3s ease-out' }}
          />

          <div style={{
            position: 'fixed', bottom: 0, left: 0, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', zIndex: 999, 
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)', animation: 'slideUpDrawer 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom))'
          }}>
            
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '15px', paddingBottom: '10px' }}>
              <div style={{ width: '40px', height: '5px', background: 'var(--text-dim)', borderRadius: '10px', opacity: 0.3 }} />
            </div>

            <div style={{ padding: '0 20px' }}>
              
              {/* HEADER DO PERFIL NA GAVETA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                <div style={{ position: 'relative', width: '70px', height: '70px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--input-bg)', border: '2px solid var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={30} color="var(--text-dim)" />}
                  </div>
                  <label style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: 'var(--accent)', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bg-card)' }}>
                    <Camera size={14} />
                    <input type="file" accept="image/*" onChange={atualizarFoto} disabled={uploadingProfile} style={{ display: 'none' }} />
                  </label>
                </div>
                
                <form onSubmit={atualizarNome} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <input 
                    type="text" value={username} onChange={(e) => setUsername(e.target.value)} 
                    placeholder="O teu nome" required 
                    style={{ background: 'transparent', border: 'none', fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', outline: 'none', padding: '0 0 5px 0', borderBottom: '1px dashed var(--border)' }}
                  />
                  {uploadingProfile ? (
                    <span style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '5px' }}>A guardar foto...</span>
                  ) : (
                    <button type="submit" style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '12px', textAlign: 'left', padding: '5px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Save size={12} /> Guardar Nome
                    </button>
                  )}
                </form>
              </div>

              {/* GRELHA DE APPS EXTRA */}
              <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '800' }}>Explorar</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
                <div onClick={() => goToTab('arena')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '15px', borderRadius: '16px' }}><Gamepad2 size={24} color="var(--accent)" /></div>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)' }}>Arena</span>
                </div>
                
                <div onClick={() => goToTab('compras')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: '16px' }}><ShoppingCart size={24} color="#10b981" /></div>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)' }}>Radar</span>
                </div>

                <div onClick={() => goToTab('livro')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '15px', borderRadius: '16px' }}><BookOpen size={24} color="var(--accent)" /></div>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)' }}>Livro</span>
                </div>

                <div onClick={() => goToTab('stats')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '15px', borderRadius: '16px' }}><BarChart3 size={24} color="#8b5cf6" /></div>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)' }}>Stats</span>
                </div>
              </div>

              {/* DEFINIÇÕES */}
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '800' }}>Definições</h4>
              <div style={{ background: 'var(--input-bg)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '20px' }}>
                <div onClick={toggleTheme} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Moon size={20} color="var(--text)" />
                    <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>Modo Escuro</span>
                  </div>
                  <div style={{ width: '44px', height: '24px', background: isDarkMode ? 'var(--accent)' : 'var(--text-dim)', borderRadius: '30px', position: 'relative', transition: 'background 0.3s' }}>
                    <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: isDarkMode ? '23px' : '3px', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                  </div>
                </div>

                <div onClick={toggleNotificacoes} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {pushEnabled ? <Bell size={20} color="var(--text)" /> : <BellOff size={20} color="var(--text)" />}
                    <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>Notificações</span>
                  </div>
                  <div style={{ width: '44px', height: '24px', background: pushEnabled ? '#10b981' : 'var(--text-dim)', borderRadius: '30px', position: 'relative', transition: 'background 0.3s' }}>
                    <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: pushEnabled ? '23px' : '3px', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                  </div>
                </div>
              </div>

              {/* LOGOUT */}
              <button onClick={() => supabase.auth.signOut()} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '100%', padding: '15px', borderRadius: '16px', fontWeight: 'bold', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <LogOut size={18} /> Terminar Sessão
              </button>

            </div>
          </div>
        </>
      )}

      {/* NAVBAR FIXA COM OS 5 BOTÕES */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, width: '100%', 
        background: 'var(--bg-card)', backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
        borderTop: '1px solid var(--border)', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px' }}>
          
          <button style={navItemStyle(tab === 'feed' && !isMenuOpen)} onClick={handleFeedClick}>
            <Home size={24} strokeWidth={tab === 'feed' && !isMenuOpen ? 2.5 : 2} />
            <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: tab === 'feed' && !isMenuOpen ? '800' : '600' }}>Feed</span>
          </button>
          
          <button style={navItemStyle(tab === 'tasca' && !isMenuOpen)} onClick={() => goToTab('tasca')}>
            <Beer size={24} strokeWidth={tab === 'tasca' && !isMenuOpen ? 2.5 : 2} />
            <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: tab === 'tasca' && !isMenuOpen ? '800' : '600' }}>Tasca</span>
          </button>
          
          <button style={navItemStyle(tab === 'missoes' && !isMenuOpen)} onClick={() => goToTab('missoes')}>
            <Target size={24} strokeWidth={tab === 'missoes' && !isMenuOpen ? 2.5 : 2} />
            <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: tab === 'missoes' && !isMenuOpen ? '800' : '600' }}>Missões</span>
          </button>

          <button style={navItemStyle(tab === 'camera' && !isMenuOpen)} onClick={() => goToTab('camera')}>
            <Camera size={24} strokeWidth={tab === 'camera' && !isMenuOpen ? 2.5 : 2} />
            <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: tab === 'camera' && !isMenuOpen ? '800' : '600' }}>Câmara</span>
          </button>

          <button style={navItemStyle(isMenuOpen)} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} />}
            <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: isMenuOpen ? '800' : '600' }}>Mais</span>
          </button>

        </div>
      </div>

      <TutorialInstalacao />
    </div>
  );
}