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
import TutorialInstalacao from './components/TutorialInstalacao';
import PermissaoNotificacoes from './components/PermissaoNotificacoes';
import { Home, Beer, Target, LayoutGrid, LogOut, Sun, BookOpen, BarChart3, ShoppingCart, Camera, Gamepad2, ChevronRight, Bell } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'feed';
  });
  const oneSignalInitRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  // 1. INICIA O ONESIGNAL
  useEffect(() => {
    if (oneSignalInitRef.current) return;
    oneSignalInitRef.current = true; 

    async function startOneSignal() {
      try {
        await OneSignal.init({
          appId: "2505560e-8033-4528-997c-eca674fa3230",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: true,
          },
        });
      } catch (error) {
        console.error("Erro ao iniciar OneSignal:", error);
      }
    }
    
    startOneSignal();
  }, []);

  // 2. ASSOCIA O UTILIZADOR E DEFINE A TAG PARA O FILTRO DA VERCEL
  useEffect(() => {
    if (session?.user?.id) {
      try {
        OneSignal.login(session.user.id);
        // Atribui a tag exata que o backend usa para filtrar o autor
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

  if (!session) {
    return <Auth />;
  }

  const navItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isActive ? '6px' : '0',
    padding: isActive ? '12px 18px' : '12px',
    borderRadius: '24px',
    background: isActive ? 'var(--accent)' : 'transparent',
    color: isActive ? 'white' : '#64748b',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontWeight: 'bold',
    fontSize: '14px'
  });

  const menuCardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '20px 15px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
    border: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    textAlign: 'center'
  };

  const pedirNotificacoes = () => {
    OneSignal.Slidedown.promptPush();
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        paddingTop: 'calc(15px + env(safe-area-inset-top))', paddingBottom: '15px',
        paddingLeft: '20px', paddingRight: '20px', 
        background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.5)', position: 'sticky',
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
        
        {tab === 'menu' && (
          <div style={{ padding: '20px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: 'var(--text)', fontSize: '24px' }}>Descobrir</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              
              <div style={menuCardStyle} onClick={pedirNotificacoes}>
                <div style={{ background: '#ffedd5', padding: '12px', borderRadius: '50%' }}>
                  <Bell size={28} color="var(--accent)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>Notificações</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Ativar Alertas</p>
                </div>
              </div>

              <div style={menuCardStyle} onClick={() => setTab('livro')}>
                <div style={{ background: '#ffedd5', padding: '12px', borderRadius: '50%' }}>
                  <BookOpen size={28} color="var(--accent)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>O Livro</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Frases míticas</p>
                </div>
              </div>

              <div style={menuCardStyle} onClick={() => setTab('compras')}>
                <div style={{ background: '#ffedd5', padding: '12px', borderRadius: '50%' }}>
                  <ShoppingCart size={28} color="var(--accent)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>Radar da Fome</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Lista de compras</p>
                </div>
              </div>

              <div style={menuCardStyle} onClick={() => setTab('stats')}>
                <div style={{ background: '#ffedd5', padding: '12px', borderRadius: '50%' }}>
                  <BarChart3 size={28} color="var(--accent)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>Estatísticas</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Gerês Wrapped</p>
                </div>
              </div>

              <div style={menuCardStyle} onClick={() => setTab('camera')}>
                <div style={{ background: '#ffedd5', padding: '12px', borderRadius: '50%' }}>
                  <Camera size={28} color="var(--accent)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>Câmara</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Descartável</p>
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
        width: '92%', maxWidth: '400px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)', borderRadius: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', 
        zIndex: 1000, border: '1px solid rgba(255,255,255,0.4)'
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