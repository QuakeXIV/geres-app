import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import Feed from './components/Feed';
import Tasca from './components/Tasca';
import DisposableCamera from './components/DisposableCamera';
import Missoes from './components/Missoes';
import Livro from './components/Livro';
import Estatisticas from './components/Estatisticas';
import Compras from './components/Compras'; // <-- IMPORT NOVO
import { Home, Beer, Camera, LogOut, Sun, Target, BookOpen, BarChart3, ShoppingCart } from 'lucide-react'; // <-- IMPORT DO CARRINHO

export default function App() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('feed');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (!session) {
    return <Auth />;
  }

  const navItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isActive ? '4px' : '0',
    padding: isActive ? '10px 14px' : '10px',
    borderRadius: '20px',
    background: isActive ? 'var(--accent)' : 'transparent',
    color: isActive ? 'white' : '#64748b',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: 'bold',
    fontSize: '12px'
  });

  return (
    <div>
      {/* Cabeçalho de Verão */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingTop: 'calc(15px + env(safe-area-inset-top))',
        paddingBottom: '15px',
        paddingLeft: '20px',
        paddingRight: '20px', 
        background: 'rgba(255, 255, 255, 0.85)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.5)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sun size={20} /> Gerês 2k26
        </h3>
        
        {/* BOTÕES DO CABEÇALHO (Carrinho + Sair) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            style={{ background: 'none', border: 'none', color: tab === 'compras' ? '#10b981' : 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => setTab('compras')}
            title="Lista de Compras"
          >
            <ShoppingCart size={22} />
          </button>
          
          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => supabase.auth.signOut()}
            title="Sair"
          >
            <LogOut size={22} />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ paddingBottom: '100px' }}>
        {tab === 'feed' && <Feed session={session} />}
        {tab === 'tasca' && <Tasca session={session} />}
        {tab === 'missoes' && <Missoes session={session} />}
        {tab === 'livro' && <Livro session={session} />}
        {tab === 'stats' && <Estatisticas />}
        {tab === 'compras' && <Compras session={session} />} {/* <-- ABA NOVA */}
        {tab === 'camera' && <DisposableCamera session={session} />}
      </div>

      {/* NAVBAR FLUTUANTE PREMIUM */}
      <div style={{
        position: 'fixed',
        bottom: 'max(20px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '95%', 
        maxWidth: '500px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        borderRadius: '30px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 8px', 
        zIndex: 1000,
        border: '1px solid rgba(255,255,255,0.4)'
      }}>
        <button style={navItemStyle(tab === 'feed')} onClick={() => setTab('feed')} title="Feed">
          <Home size={20} />
          {tab === 'feed' && <span>Feed</span>}
        </button>
        <button style={navItemStyle(tab === 'tasca')} onClick={() => setTab('tasca')} title="Tasca">
          <Beer size={20} />
          {tab === 'tasca' && <span>Tasca</span>}
        </button>
        <button style={navItemStyle(tab === 'missoes')} onClick={() => setTab('missoes')} title="Missões">
          <Target size={20} />
          {tab === 'missoes' && <span>Missões</span>}
        </button>
        <button style={navItemStyle(tab === 'livro')} onClick={() => setTab('livro')} title="Livro">
          <BookOpen size={20} />
          {tab === 'livro' && <span>Livro</span>}
        </button>
        <button style={navItemStyle(tab === 'stats')} onClick={() => setTab('stats')} title="Estatísticas">
          <BarChart3 size={20} />
          {tab === 'stats' && <span>Stats</span>}
        </button>
        <button style={navItemStyle(tab === 'camera')} onClick={() => setTab('camera')} title="Câmara">
          <Camera size={20} />
          {tab === 'camera' && <span>Foto</span>}
        </button>
      </div>
    </div>
  );
}