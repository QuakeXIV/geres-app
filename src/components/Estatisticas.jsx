import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart3, Trophy, Flame, Target, MessageSquareQuote, TrendingUp, Zap, Crown, Gamepad2, Skull, RefreshCw } from 'lucide-react';

export default function Estatisticas() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [stats, setStats] = useState({
    totalBebidas: 0,
    topBebida: '-',
    reiTasca: '-',
    reiMissoes: '-',
    totalMissoes: 0,
    alvoMaisCitado: '-',
    reiArena: '-',
    sacoPancada: '-'
  });

  const tabelaPutometros = [
    { nome: 'Imperial / fino', putometro: 2 },
    { nome: 'Shot de Tequila', putometro: 5 },
    { nome: 'Copo de Vinho', putometro: 4 },
    { nome: 'Jarra de Sangria', putometro: 8 },
    { nome: 'Shot de Absinto', putometro: 10 },
    { nome: 'Garrafa de licor / Vodka', putometro: 25 },
  ];

  useEffect(() => {
    calcularWrapped(true);

    const recarregarSeVisivel = () => {
      if (document.visibilityState === 'visible') {
        calcularWrapped(false);
      }
    };

    document.addEventListener('visibilitychange', recarregarSeVisivel);
    window.addEventListener('focus', recarregarSeVisivel);

    return () => {
      document.removeEventListener('visibilitychange', recarregarSeVisivel);
      window.removeEventListener('focus', recarregarSeVisivel);
    };
  }, []);

  async function calcularWrapped(initial = false) {
    if (initial) setLoading(true);
    setIsRefreshing(true);

    const { data: drinks } = await supabase.from('drinks').select('*, profiles(username)');
    const { data: missions } = await supabase.from('challenge_requests').select('*, profiles(username)').eq('status', 'completed');
    const { data: quotes } = await supabase.from('tasca_quotes').select('*');
    const { data: games } = await supabase.from('arena_games').select('*').eq('status', 'finished');

    let newStats = { totalBebidas: 0, topBebida: '-', reiTasca: '-', reiMissoes: '-', totalMissoes: 0, alvoMaisCitado: '-', reiArena: '-', sacoPancada: '-' };

    // TASCA
    if (drinks && drinks.length > 0) {
      let totalBebidas = 0;
      const contagemBebidas = {};
      const pontuacaoUsers = {};

      drinks.forEach(d => {
        const qty = d.quantity || 1;
        totalBebidas += qty;

        if (!contagemBebidas[d.drink_name]) contagemBebidas[d.drink_name] = 0;
        contagemBebidas[d.drink_name] += qty;

        const username = d.profiles?.username || 'Anónimo';
        const infoBebida = tabelaPutometros.find(b => b.nome.toLowerCase() === d.drink_name.toLowerCase());
        const pontos = infoBebida ? infoBebida.putometro : 2;
        
        if (!pontuacaoUsers[username]) pontuacaoUsers[username] = 0;
        pontuacaoUsers[username] += (pontos * qty);
      });

      newStats.totalBebidas = totalBebidas;
      newStats.topBebida = Object.keys(contagemBebidas).reduce((a, b) => contagemBebidas[a] > contagemBebidas[b] ? a : b);
      newStats.reiTasca = Object.keys(pontuacaoUsers).reduce((a, b) => pontuacaoUsers[a] > pontuacaoUsers[b] ? a : b);
    }

    // MISSÕES
    if (missions && missions.length > 0) {
      newStats.totalMissoes = missions.length;
      
      const contagemMissoes = {};
      missions.forEach(m => {
        const username = m.profiles?.username || 'Anónimo';
        if (!contagemMissoes[username]) contagemMissoes[username] = 0;
        contagemMissoes[username] += 1;
      });

      newStats.reiMissoes = Object.keys(contagemMissoes).reduce((a, b) => contagemMissoes[a] > contagemMissoes[b] ? a : b);
    }

    // LIVRO
    if (quotes && quotes.length > 0) {
      const contagemAutores = {};
      quotes.forEach(q => {
        const autor = q.author;
        if (!contagemAutores[autor]) contagemAutores[autor] = 0;
        contagemAutores[autor] += 1;
      });

      newStats.alvoMaisCitado = Object.keys(contagemAutores).reduce((a, b) => contagemAutores[a] > contagemAutores[b] ? a : b);
    }

    // ARENA DE JOGOS
    if (games && games.length > 0) {
      const vitorias = {};
      const derrotas = {};

      games.forEach(g => {
        let winner = null;
        let loser = null;
        
        if (g.score1 > g.score2) {
          winner = g.team1_name;
          loser = g.team2_name;
        } else if (g.score2 > g.score1) {
          winner = g.team2_name;
          loser = g.team1_name;
        }

        if (winner && loser) {
          if (!vitorias[winner]) vitorias[winner] = 0;
          if (!derrotas[loser]) derrotas[loser] = 0;
          
          vitorias[winner] += 1;
          derrotas[loser] += 1;
        }
      });

      if (Object.keys(vitorias).length > 0) {
        newStats.reiArena = Object.keys(vitorias).reduce((a, b) => vitorias[a] > vitorias[b] ? a : b);
      }
      if (Object.keys(derrotas).length > 0) {
        newStats.sacoPancada = Object.keys(derrotas).reduce((a, b) => derrotas[a] > derrotas[b] ? a : b);
      }
    }

    setStats(newStats);
    if (initial) setLoading(false);
    setIsRefreshing(false);
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-dim)' }}>A calcular os estragos... 📊</div>;
  }

  return (
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      {/* BOTÃO DE REFRESH MANUAL NO TOPO */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
        <button onClick={() => calcularWrapped(false)} disabled={isRefreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 15px', borderRadius: '20px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <RefreshCw size={16} /> {isRefreshing ? 'A atualizar...' : 'Atualizar Stats'}
        </button>
      </div>

      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <BarChart3 size={100} color="#ffedd5" style={{ position: 'absolute', top: '-10px', right: '-20px', opacity: 0.2 }} />
        <h2 style={{ margin: '0 0 5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <TrendingUp size={26} /> Gerês Wrapped
        </h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9, position: 'relative' }}>A verdade crua e nua da nossa viagem.</p>
      </div>

      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={20} color="var(--text-dim)" /> Números do Grupo
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: 'var(--input-bg)', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '30px', display: 'block', marginBottom: '5px' }}>🍻</span>
            <h4 style={{ margin: 0, fontSize: '24px', color: 'var(--accent)' }}>{stats.totalBebidas}</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold' }}>BEBIDAS TOTAIS</p>
          </div>
          <div style={{ background: 'var(--input-bg)', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '30px', display: 'block', marginBottom: '5px' }}>⚔️</span>
            <h4 style={{ margin: 0, fontSize: '24px', color: '#3b82f6' }}>{stats.totalMissoes}</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold' }}>MISSÕES FEITAS</p>
          </div>
        </div>
        
        <div style={{ background: 'var(--input-bg)', padding: '15px', borderRadius: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
          <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '10px', borderRadius: '50%' }}>
            <Flame size={24} color="var(--accent)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold' }}>O NÉCTAR FAVORITO</p>
            <h4 style={{ margin: '2px 0 0 0', fontSize: '18px', color: 'var(--text)' }}>{stats.topBebida}</h4>
          </div>
        </div>
      </div>

      <h3 style={{ margin: '20px 0 10px 10px', fontSize: '16px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>🏆 Hall da Fama</h3>

      <div className="card" style={{ background: 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <Crown size={80} color="#fef9c3" style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.5 }} />
        <div style={{ position: 'relative' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#854d0e', fontWeight: 'bold' }}>REI/RAINHA DA TASCA</p>
          <h4 style={{ margin: '5px 0 0 0', fontSize: '24px', color: '#713f12' }}>@{stats.reiTasca}</h4>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#854d0e' }}>A pessoa que mais dano causou ao próprio fígado.</p>
        </div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <Target size={80} color="#eff6ff" style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.5 }} />
        <div style={{ position: 'relative' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#1e3a8a', fontWeight: 'bold' }}>O MAIS MALUCO DAS MISSÕES</p>
          <h4 style={{ margin: '5px 0 0 0', fontSize: '24px', color: '#1e40af' }}>@{stats.reiMissoes}</h4>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#1e3a8a' }}>Nunca recusa um desafio. Tem mais missões aprovadas.</p>
        </div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <Gamepad2 size={80} color="#f1f5f9" style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.3 }} />
        <div style={{ position: 'relative' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#334155', fontWeight: 'bold' }}>O CAMPEÃO DOS JOGOS</p>
          <h4 style={{ margin: '5px 0 0 0', fontSize: '24px', color: '#0f172a' }}>{stats.reiArena}</h4>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#334155' }}>Quem acumulou mais vitórias na Arena.</p>
        </div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <MessageSquareQuote size={80} color="#fef2f2" style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.5 }} />
        <div style={{ position: 'relative' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d', fontWeight: 'bold' }}>O POETA DA CASA</p>
          <h4 style={{ margin: '5px 0 0 0', fontSize: '24px', color: '#991b1b' }}>{stats.alvoMaisCitado}</h4>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#7f1d1d' }}>Disse mais barbaridades registadas no Livro Sagrado.</p>
        </div>
      </div>

      <div className="card" style={{ background: '#1e293b', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <Skull size={80} color="#334155" style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.3 }} />
        <div style={{ position: 'relative' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>O SACO DE PANCADA</p>
          <h4 style={{ margin: '5px 0 0 0', fontSize: '24px', color: 'white' }}>{stats.sacoPancada}</h4>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>A pessoa/equipa com o infeliz recorde de derrotas na Arena.</p>
        </div>
      </div>

    </div>
  );
}