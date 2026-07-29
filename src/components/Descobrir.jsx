import { Map, MapPin, Navigation, PhoneCall, Music, AlertTriangle, Lightbulb } from 'lucide-react';

export default function Descobrir() {
  const locais = [
    { title: 'A Casa', icon: <MapPin size={24} color="#f97316" />, link: 'https://maps.google.com/?q=Geres', desc: 'Abre no Google Maps' },
    { title: 'Supermercado', icon: <ShoppingCart size={24} color="#10b981" />, link: '#', desc: 'Intermarché a 10 min' },
    { title: 'Praia Fluvial', icon: <Navigation size={24} color="#3b82f6" />, link: '#', desc: 'Cascatas do Tahiti' },
    { title: 'Playlist da Viagem', icon: <Music size={24} color="#8b5cf6" />, link: 'https://open.spotify.com/', desc: 'Música para a alma' }
  ];

  const emergencias = [
    { title: 'Urgências (112)', icon: <PhoneCall size={20} color="#ef4444" /> },
    { title: 'GNR Local', icon: <AlertTriangle size={20} color="#eab308" /> }
  ];

  return (
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white' }}>
        <h2 style={{ margin: '0 0 5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <Map size={26} /> Descobrir o Gerês
        </h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Tudo o que precisas para sobreviver à viagem.</p>
      </div>

      <h3 style={{ margin: '20px 0 10px 10px', fontSize: '16px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        📍 Pontos de Interesse
      </h3>
      
      {/* GRELHA BONITA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {locais.map((local, index) => (
          <a key={index} href={local.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '15px', margin: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border)' }}>
              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '50%' }}>
                {local.icon}
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '15px' }}>{local.title}</h4>
                <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '12px' }}>{local.desc}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      <h3 style={{ margin: '25px 0 10px 10px', fontSize: '16px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        💡 Regras da Casa
      </h3>
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🍷</span>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px', lineHeight: '1.4' }}>Último a ir dormir apanha as garrafas e os copos do chão.</p>
        </div>
        <div style={{ padding: '15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🧹</span>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px', lineHeight: '1.4' }}>Sujaste? Limpas. Especialmente se te vomitares no sofá.</p>
        </div>
        <div style={{ padding: '15px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>💰</span>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px', lineHeight: '1.4' }}>As contas são a dividir por todos no Splitwise no final.</p>
        </div>
      </div>

      <h3 style={{ margin: '25px 0 10px 10px', fontSize: '16px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        🚨 Emergências
      </h3>
      <div className="card" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {emergencias.map((em, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '12px', borderRadius: '10px' }}>
              {em.icon}
              <span style={{ fontWeight: 'bold', color: '#7f1d1d', fontSize: '15px' }}>{em.title}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Pequeno import extra no topo para o carrinho (só para este ecrã)
import { ShoppingCart } from 'lucide-react';