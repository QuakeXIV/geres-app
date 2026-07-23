import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import Feed from './components/Feed';
import Tasca from './components/Tasca';
import DisposableCamera from './components/DisposableCamera';
import { Home, Beer, Camera, LogOut, Sun } from 'lucide-react';

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

  return (
    <div>
      {/* Cabeçalho de Verão */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '15px 20px', 
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
        <button
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut size={22} />
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{ paddingBottom: '20px' }}>
        {tab === 'feed' && <Feed session={session} />}
        {tab === 'tasca' && <Tasca session={session} />}
        {tab === 'camera' && <DisposableCamera session={session} />}
      </div>

      {/* Barra de Navegação Inferior */}
      <div className="navbar">
        <button className={`nav-btn ${tab === 'feed' ? 'active' : ''}`} onClick={() => setTab('feed')}>
          <Home size={24} />
          <span>Feed</span>
        </button>
        <button className={`nav-btn ${tab === 'tasca' ? 'active' : ''}`} onClick={() => setTab('tasca')}>
          <Beer size={24} />
          <span>Tasca</span>
        </button>
        <button className={`nav-btn ${tab === 'camera' ? 'active' : ''}`} onClick={() => setTab('camera')}>
          <Camera size={24} />
          <span>Câmara</span>
        </button>
      </div>
    </div>
  );
}