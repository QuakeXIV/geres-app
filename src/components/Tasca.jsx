import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Beer, Flame, Crown, Baby } from 'lucide-react';

export default function Tasca({ session }) {
  const [drinks, setDrinks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [horasPassadas, setHorasPassadas] = useState(0);

  useEffect(() => {
    carregarDadosTasca();
  }, []);

  async function carregarDadosTasca() {
    // 1. Ir buscar todas as bebidas registradas
    const { data: dadosBebidas } = await supabase
      .from('drinks')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false });

    if (!dadosBebidas || dadosBebidas.length === 0) {
      setDrinks([]);
      setLeaderboard([]);
      return;
    }

    // 2. Verificar Inatividade Automática (3 Horas)
    const ultimaBebidaTempo = new Date(dadosBebidas[0].created_at).getTime();
    const agora = new Date().getTime();
    const diferencaHoras = (agora - ultimaBebidaTempo) / (1000 * 60 * 60);

    setHorasPassadas(diferencaHoras.toFixed(1));

    // Se passaram mais de 3 horas sem consumo, consideramos a sessão "resetada"
    const bebidasSessaoAtual = diferencaHoras > 3 
      ? [] 
      : dadosBebidas.filter(b => (agora - new Date(b.created_at).getTime()) / (1000 * 60 * 60) <= 12);

    setDrinks(bebidasSessaoAtual);

    // 3. Calcular Leaderboard
    const contagem = {};
    bebidasSessaoAtual.forEach(b => {
      const nome = b.profiles?.username || 'Anónimo';
      contagem[nome] = (contagem[nome] || 0) + 1;
    });

    const ordenado = Object.entries(contagem)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);

    setLeaderboard(ordenado);
  }

  async function RegistarBebida(tipo) {
    await supabase.from('drinks').insert([{
      user_id: session.user.id,
      drink_type: tipo
    }]);

    carregarDadosTasca();
  }

  return (
    <div style={{ padding: '10px' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>🍺 Tasca 2k26</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          {horasPassadas > 3 
            ? '🔴 Sessão anterior encerrada por inatividade. Clica para começar nova ronda!' 
            : `🟢 Sessão Ativa! Última bebida há ${horasPassadas}h.`}
        </p>

        {/* Botões de Bebida */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
          <button className="btn-primary" onClick={() => RegistarBebida('Cerveja')}>🍺 Cerveja</button>
          <button className="btn-primary" onClick={() => RegistarBebida('Shot')}>🥃 Shot</button>
          <button className="btn-primary" onClick={() => RegistarBebida('Gin')}>🍸 Gin</button>
          <button className="btn-primary" onClick={() => RegistarBebida('Sangria')}>🍷 Sangria</button>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <h3>🏆 Leaderboard da Sessão</h3>
        {leaderboard.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Ainda ninguém bebeu nesta sessão!</p>
        ) : (
          leaderboard.map((item, index) => (
            <div key={item.nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
              <span>
                {index === 0 && '👑 '}
                {index === leaderboard.length - 1 && leaderboard.length > 1 && '🍼 '}
                <strong>@{item.nome}</strong>
              </span>
              <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{item.total} bebidas</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}