import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import OneSignal from 'react-onesignal';
import Auth from './components/Auth';
import Feed from './components/Feed';
import Tasca from './components/Tasca';
import DisposableCamera from './components/DisposableCamera';
import Missoes from './components/Missoes';
import Livro from './components/Livro';
import Estatisticas from './components/Estatisticas';
import Compras from './components/Compras';
import Arena from './components/Arena';
import Perfil from './components/Perfil';
import Descobrir from './components/Descobrir';
import TutorialInstalacao from './components/TutorialInstalacao';
import PermissaoNotificacoes from './components/PermissaoNotificacoes';
import { Home, Beer, Target, LayoutGrid, LogOut, Sun, BookOpen, BarChart3, ShoppingCart, Camera, Gamepad2, ChevronRight, Bell, BellOff, Map, User } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'feed';
  });
  const oneSignalInitRef = useRef(false);

  // ESTADO PARA O ALERTA E PARA O TOGGLE
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [pushEnabled, setPushEnabled] = useState(false);

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  // 1. INICIA O ONESIGNAL E LÊ O ESTADO ATUAL DAS NOTIFICAÇÕES
  useEffect(() => {
    if (oneSignalInitRef.current) return;
    oneSignalInitRef.current = true; 

    async function startOneSignal() {
      try {
        await OneSignal.init({
          appId: "2505560e-8033-4528-997c-eca674fa3230",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false }, // Escondemos o sino feio default
        });

        // Verifica se o gajo já tem notificações ativas neste telemóvel/PC
        if (OneSignal.User && OneSignal.User.PushSubscription) {
          const isAtivo = OneSignal.User.PushSubscription.optedIn;
          setPushEnabled(isAtivo);
        }
      } catch (error) {
        console.error("Erro ao iniciar OneSignal:", error);
      }
    }
    
    startOneSignal();
  }, []);

  // 2. ASSOCIA O UTILIZADOR E DEFINE A TAG
  useEffect(() => {
    if (session?.user?.id) {
      try {
        OneSignal.login(session.user.id);
        if (OneSignal.User) {
          OneSignal.User.addTag("app_user_id", session.user.id);
        } else {
          OneSignal.sendTag("app_user_id", session.user.id);
        }
      } catch (e) {
        console.log("OneSignal login/tag erro:", e);
      }
    }
  }, [session]);

  // Mantém o modo escuro a funcionar ao arrancar a app
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
    }
  }, []);

  if (!session) {
    return <Auth />;
  }

  const navItemStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: isActive ? '6px' : '0', padding: isActive ? '12px 18px' : '12px',
    borderRadius: '24px', background: isActive ? 'var(--accent)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-dim)', border: 'none', cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', fontWeight: 'bold', fontSize: '14px'
  });

  const menuCardStyle = {
    background: 'var(--bg-card)', borderRadius: '16px', padding: '20px 15px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
    border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s',
    textAlign: 'center', position: 'relative'
  };

  // 3. TOGGLE DE NOTIFICAÇÕES REAL E INTUITIVO
  const toggleNotificacoes = async () => {
    try {
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        if (pushEnabled) {
          await OneSignal.User.PushSubscription.optOut();
          setPushEnabled(false); // Atualiza logo o visual para vermelho
          showToast("Notificações desativadas 🔕", "error");
        } else {
          await OneSignal.User.PushSubscription.optIn();
          if (OneSignal.Slidedown) await OneSignal.Slidedown.promptPush();
          setPushEnabled(true); // Atualiza logo o visual para verde
          showToast("Notificações ativadas 🔔", "success");
        }
      }
    } catch (error) {
      console.error("Erro no toggle de notificações:", error);
    }
  };

  return (
    <div>
      {/* O NOSSO TOAST BONITO */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: 'calc(60px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, width: '90%', maxWidth: '400px',
          background: toast.type === 'error' ? '#ef4444' : 'var(--accent)',
          color: 'white', padding: '12px 20px', borderRadius: '12px',
          textAlign: 'center', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        paddingTop: 'calc(15px + env(safe-area-inset-top))', paddingBottom: '15px',
        paddingLeft: '20px', paddingRight: '20px', 
        background: 'var(--bg-card)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)', position: 'sticky',
        top: 0, zIndex: 100, boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sun size={20} /> Gerês 2k26
        </h3>
        
        <button
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={() => supabase.auth.signOut()}
          title="Sair"
        >
          <LogOut size={22} />
        </button>
      </div>

      <div style={{ paddingBottom: '110px' }}>
        {tab === 'feed' && <Feed session={session} />}
        {tab === 'tasca' && <Tasca session={session} />}
        {tab === 'missoes' && <Missoes session={session} />}
        {tab === 'livro' && <Livro session={session} />}
        {tab === 'stats' && <Estatisticas />}
        {tab === 'compras' && <Compras session={session} />}
        {tab === 'camera' && <DisposableCamera session={session} />}
        {tab === 'arena' && <Arena session={session} />}
        {tab === 'perfil' && <Perfil session={session} />}
        {tab === 'descobrir' && <Descobrir />}
        
        {tab === 'menu' && (
          <div style={{ padding: '20px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: 'var(--text)', fontSize: '24px' }}>Menu Principal</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              
              {/* CARTÃO DO PERFIL */}
              <div style={menuCardStyle} onClick={() => setTab('perfil')}>
                <div style={{ background: '#ffedd5', padding: '12px', borderRadius: '50%' }}>
                  <User size={28} color="var(--accent)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>O Meu Perfil</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Foto e Definições</p>
                </div>
              </div>

              {/* CARTÃO DO DESCOBRIR */}
              <div style={menuCardStyle} onClick={() => setTab('descobrir')}>
                <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '50%' }}>
                  <Map size={28} color="#3b82f6" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>Descobrir</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Gerês Guia</p>
                </div>
              </div>

              {/* CARTÃO DO LIVRO */}
              <div style={menuCardStyle} onClick={() => setTab('livro')}>
                <div style={{ background: '#ffedd5', padding: '12px', borderRadius: '50%' }}>
                  <BookOpen size={28} color="var(--accent)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>O Livro</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Frases míticas</p>
                </div>
              </div>

              {/* CARTÃO DA CÂMARA */}
              <div style={menuCardStyle} onClick={() => setTab('camera')}>
                <div style={{ background: '#ffedd5', padding: '12px', borderRadius: '50%' }}>
                  <Camera size={28} color="var(--accent)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>Câmara</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Descartável</p>
                </div>
              </div>

              {/* CARTÃO DAS ESTATÍSTICAS */}
              <div style={menuCardStyle} onClick={() => setTab('stats')}>
                <div style={{ background: '#ffedd5', padding: '12px', borderRadius: '50%' }}>
                  <BarChart3 size={28} color="var(--accent)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>Estatísticas</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Gerês Wrapped</p>
                </div>
              </div>

              {/* CARTÃO DO RADAR DA FOME */}
              <div style={menuCardStyle} onClick={() => setTab('compras')}>
                <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '50%' }}>
                  <ShoppingCart size={28} color="#10b981" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>Radar da Fome</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Lista de compras</p>
                </div>
              </div>

              {/* CARTÃO DE NOTIFICAÇÕES */}
              <div 
                style={{ 
                  ...menuCardStyle, 
                  border: pushEnabled ? '2px solid #22c55e' : '2px solid var(--border)'
                }} 
                onClick={toggleNotificacoes}
              >
                <div style={{
                  position: 'absolute', top: '12px', right: '12px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: pushEnabled ? '#22c55e' : '#ef4444',
                  boxShadow: pushEnabled ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none'
                }} />
                
                <div style={{ background: pushEnabled ? '#dcfce7' : '#fee2e2', padding: '12px', borderRadius: '50%' }}>
                  {pushEnabled ? <Bell size={28} color="#16a34a" /> : <BellOff size={28} color="#dc2626" />}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>Notificações</h4>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: pushEnabled ? '#16a34a' : '#dc2626' }}>
                    {pushEnabled ? 'LIGADAS' : 'DESLIGADAS'}
                  </p>
                </div>
              </div>

            </div>

            <h3 style={{ margin: '30px 0 15px 0', color: 'var(--text)', fontSize: '18px' }}>Competição</h3>
            
            <div 
              style={{ ...menuCardStyle, flexDirection: 'row', justifyContent: 'space-between', padding: '20px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', border: 'none' }}
              onClick={() => setTab('arena')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px' }}>
                  <Gamepad2 size={28} color="white" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h4 style={{ margin: '0 0 4px 0', color: 'white', fontSize: '16px' }}>Arena de Jogos</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Torneios e Marcadores</p>
                </div>
              </div>
              <ChevronRight size={24} color="rgba(255,255,255,0.6)" />
            </div>

          </div>
        )}
      </div>

      <div style={{
        position: 'fixed', bottom: 'max(20px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
        width: '92%', maxWidth: '400px', background: 'var(--bg-card)', backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)', borderRadius: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', 
        zIndex: 1000, border: '1px solid var(--border)'
      }}>
        <button style={navItemStyle(tab === 'feed')} onClick={() => setTab('feed')}>
          <Home size={22} />
          {tab === 'feed' && <span>Feed</span>}
        </button>
        <button style={navItemStyle(tab === 'tasca')} onClick={() => setTab('tasca')}>
          <Beer size={22} />
          {tab === 'tasca' && <span>Tasca</span>}
        </button>
        <button style={navItemStyle(tab === 'missoes')} onClick={() => setTab('missoes')}>
          <Target size={22} />
          {tab === 'missoes' && <span>Missões</span>}
        </button>
        <button style={navItemStyle(tab === 'menu')} onClick={() => setTab('menu')}>
          <LayoutGrid size={22} />
          {tab === 'menu' && <span>Menu</span>}
        </button>
      </div>

      <TutorialInstalacao />
      <PermissaoNotificacoes />
    </div>
  );
}