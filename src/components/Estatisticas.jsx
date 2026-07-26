import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart3, Trophy, Flame, Target, MessageSquareQuote, TrendingUp, Zap, Crown } from 'lucide-react';

export default function Estatisticas() {
  const [loading, setLoading] = useState(true);
  
  // Estados para guardar os vencedores
  const [stats, setStats] = useState({
    totalBebidas: 0,
    topBebida: '-',
    reiTasca: '-',
    reiMissoes: '-',
    totalMissoes: 0,
    alvoMaisCitado: '-'
  });

  // A tua tabela oficial para os cálculos
  const tabelaPutometros = [
    { nome: 'Imperial / fino', putometro: 2 },
    { nome: 'Shot de Tequila', putometro: 5 },
    { nome: 'Copo de Vinho', putometro: 4 },
    { nome: 'Jarra de Sangria', putometro: 8 },
    { nome: 'Shot de Absinto', putometro: 10 },
    { nome: 'Garrafa de licor / Vodka', putometro: 25 },
  ];

  useEffect(() => {
    calcularWrapped();
  }, []);

  async function calcularWrapped() {
    setLoading(true);

    // 1. Puxar todos os dados necessários
    const { data: drinks } = await supabase.from('drinks').select('*, profiles(username)');
    const { data: missions } = await supabase.from('challenge_requests').select('*, profiles(username)').eq('status', 'completed');
    const { data: quotes } = await supabase.from('tasca_quotes').select('*');

    let newStats = { totalBebidas: 0, topBebida: '-', reiTasca: '-', reiMissoes: '-', totalMissoes: 0, alvoMaisCitado: '-' };

    // --- CÁLCULOS DA TASCA ---
    if (drinks && drinks.length > 0) {
      let totalBebidas = 0;
      const contagemBebidas = {};
      const pontuacaoUsers = {};

      drinks.forEach(d => {
        const qty = d.quantity || 1;
        totalBebidas += qty;

        // Bebida mais popular
        if (!contagemBebidas[d.drink_name]) contagemBebidas[d.drink_name] = 0;
        contagemBebidas[d.drink_name] += qty;

        // Rei da Tasca (por Putómetros)
        const username = d.profiles?.username || 'Anónimo';
        const infoBebida = tabelaPutometros.find(b => b.nome.toLowerCase() === d.drink_name.toLowerCase());
        const pontos = infoBebida ? infoBebida.putometro : 2;
        
        if (!pontuacaoUsers[username]) pontuacaoUsers[username] = 0;
        pontuacaoUsers[username] += (pontos * qty);
      });

      newStats.totalBebidas = totalBebidas;
      
      // Encontrar a bebida mais bebida
      const topBebida = Object.keys(contagemBebidas).reduce((a, b) => contagemBebidas[a] > contagemBebidas[b] ? a : b);
      newStats.topBebida = topBebida;

      // Encontrar o Rei da Tasca
      const reiTasca = Object.keys(pontuacaoUsers).reduce((a, b) => pontuacaoUsers[a] > pontuacaoUsers[b] ? a : b);
      newStats.reiTasca = reiTasca;
    }

    // --- CÁLCULOS DAS MISSÕES ---
    if (missions && missions.length > 0) {
      newStats.totalMissoes = missions.length;
      
      const contagemMissoes = {};
      missions.forEach(m => {
        const username = m.profiles?.username || 'Anónimo';
        if (!contagemMissoes[username]) contagemMissoes[username] = 0;
        contagemMissoes[username] += 1;
      });

      const reiMissoes = Object.keys(contagemMissoes).reduce((a, b) => contagemMissoes[a] > contagemMissoes[b] ? a : b);
      newStats.reiMissoes = reiMissoes;
    }

    // --- CÁLCULOS DO LIVRO ---
    if (quotes && quotes.length > 0) {
      const contagemAutores = {};
      quotes.forEach(q => {
        const autor = q.author; // O nome que foi escrito à mão
        if (!contagemAutores[autor]) contagemAutores[autor] = 0;
        contagemAutores[autor] += 1;
      });

      const maisCitado = Object.keys(contagemAutores).reduce((a, b) => contagemAutores[a] > contagemAutores[b] ? a : b);
      newStats.alvoMaisCitado = maisCitado;
    }

    setStats(newStats);
    setLoading(false);
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-dim)' }}>A calcular os estragos... 📊</div>;
  }

  return (
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      {/* CABEÇALHO */}
      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <BarChart3 size={100} color="#ffedd5" style={{ position: 'absolute', top: '-10px', right: '-20px', opacity: 0.2 }} />
        <h2 style={{ margin: '0 0 5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <TrendingUp size={26} /> Gerês Wrapped
        </h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9, position: 'relative' }}>A verdade crua e nua da nossa viagem.</p>
      </div>

      {/* BLOCO 1: O ESTRAGO GERAL */}
      <div className="card" style={{ background: '#f8fafc', border: '2px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={20} color="#64748b" /> Números do Grupo
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '30px', display: 'block', marginBottom: '5px' }}>🍻</span>
            <h4 style={{ margin: 0, fontSize: '24px', color: 'var(--accent)' }}>{stats.totalBebidas}</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold' }}>BEBIDAS TOTAIS</p>
          </div>
          <div style={{ background: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '30px', display: 'block', marginBottom: '5px' }}>⚔️</span>
            <h4 style={{ margin: 0, fontSize: '24px', color: '#3b82f6' }}>{stats.totalMissoes}</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold' }}>MISSÕES FEITAS</p>
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
          <div style={{ background: '#ffedd5', padding: '10px', borderRadius: '50%' }}>
            <Flame size={24} color="var(--accent)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold' }}>O NÉCTAR FAVORITO</p>
            <h4 style={{ margin: '2px 0 0 0', fontSize: '18px', color: 'var(--text)' }}>{stats.topBebida}</h4>
          </div>
        </div>
      </div>

      {/* BLOCO 2: HALL DA FAMA (OS HERÓIS) */}
      <h3 style={{ margin: '20px 0 10px 10px', fontSize: '16px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>🏆 Hall da Fama</h3>

      <div className="card" style={{ background: 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <Crown size={80} color="#fef9c3" style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.5 }} />
        <div style={{ position: 'relative' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#854d0e', fontWeight: 'bold' }}>REI/RAINHA DA TASCA</p>
          <h4 style={{ margin: '5px 0 0 0', fontSize: '24px', color: '#713f12' }}>@{stats.reiTasca}</h4>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#854d0e' }}>A pessoa que mais dano causou ao próprio fígado (mais Putómetros acumulados).</p>
        </div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <Target size={80} color="#eff6ff" style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.5 }} />
        <div style={{ position: 'relative' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#1e3a8a', fontWeight: 'bold' }}>O MAIS MALUCO DAS MISSÕES</p>
          <h4 style={{ margin: '5px 0 0 0', fontSize: '24px', color: '#1e40af' }}>@{stats.reiMissoes}</h4>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#1e3a8a' }}>Nunca recusa um desafio. Tem mais missões cumpridas e aprovadas pelo Tribunal.</p>
        </div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <MessageSquareQuote size={80} color="#fef2f2" style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.5 }} />
        <div style={{ position: 'relative' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d', fontWeight: 'bold' }}>O POETA DA CASA</p>
          <h4 style={{ margin: '5px 0 0 0', fontSize: '24px', color: '#991b1b' }}>{stats.alvoMaisCitado}</h4>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#7f1d1d' }}>A pessoa que disse mais barbaridades registadas no Livro Sagrado.</p>
        </div>
      </div>

    </div>
  );
}