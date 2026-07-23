import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Beer, Award, BookOpen, Plus, Flame, Trash2 } from 'lucide-react';

export default function Tasca({ session }) {
  const [subTab, setSubTab] = useState('leaderboard');
  const [drinks, setDrinks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  const [tabelaPutometros] = useState([
    { id: 1, nome: 'Imperial / fino', putometro: 2, icone: '🍺' },
    { id: 2, nome: 'Shot de Tequila', putometro: 5, icone: '🥃' },
    { id: 3, nome: 'Copo de Vinho', putometro: 4, icone: '🍷' },
    { id: 4, nome: 'Jarra de Sangria', putometro: 8, icone: '🍹' },
    { id: 5, nome: 'Shot de Absinto', putometro: 10, icone: '☠️' },
    { id: 6, nome: 'Garrafa de licor / Vodka', putometro: 25, icone: '🍾' },
  ]);

  useEffect(() => {
    carregarDadosTasca();
  }, []);

  async function carregarDadosTasca() {
    const { data: drinksData, error: drinksError } = await supabase
      .from('drinks')
      .select('*')
      .order('created_at', { ascending: false });

    if (drinksError) {
      showToast(`Erro drinks: ${drinksError.message}`, 'error');
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username');

    if (profilesError) {
      showToast(`Erro profiles: ${profilesError.message}`, 'error');
      return;
    }

    const drinksComPerfis = (drinksData || []).map(drink => {
      const perfil = (profilesData || []).find(p => p.id === drink.user_id);
      return {
        ...drink,
        profiles: perfil || { username: 'Membro do Grupo' }
      };
    });

    setDrinks(drinksComPerfis);
    calcularLeaderboard(drinksComPerfis);
  }

  function calcularLeaderboard(registos) {
    const scores = {};

    registos.forEach((registo) => {
      const username = registo.profiles?.username || 'Membro do Grupo';
      
      const bebidaInfo = tabelaPutometros.find(
        b => b.nome.trim().toLowerCase() === registo.drink_name.trim().toLowerCase()
      );
      
      const valorPutometro = bebidaInfo ? bebidaInfo.putometro : 2;
      const totalGanha = valorPutometro * (registo.quantity || 1);

      if (!scores[username]) {
        scores[username] = 0;
      }
      scores[username] += totalGanha;
    });

    const rankingArray = Object.keys(scores).map(user => ({
      username: user,
      totalPutometros: scores[user]
    })).sort((a, b) => b.totalPutometros - a.totalPutometros);

    setLeaderboard(rankingArray);
  }

  async function registarBebida(e) {
    e.preventDefault();
    if (!selectedDrink) return showToast('Escolhe uma bebida!', 'error');

    setLoading(true);

    const { error } = await supabase.from('drinks').insert([{
      user_id: session.user.id,
      drink_name: selectedDrink,
      quantity: parseInt(quantidade)
    }]);

    if (error) {
      showToast(`Erro ao gravar: ${error.message}`, 'error');
    } else {
      showToast('Consumo registado com sucesso! 🍻', 'success');
      setSelectedDrink('');
      setQuantidade(1);
      await carregarDadosTasca(); // Atualiza leaderboard na hora
    }
    setLoading(false);
  }

  // NOVA FUNÇÃO: Apagar um registo de bebida
  async function apagarConsumo(drinkId) {
    const { error } = await supabase.from('drinks').delete().eq('id', drinkId);

    if (error) {
      showToast(`Erro ao apagar: ${error.message}`, 'error');
    } else {
      showToast('Consumo removido! 🗑️', 'success');
      await carregarDadosTasca(); // Atualiza leaderboard na hora
    }
  }

  return (
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      {toast.show && (
        <div className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'fixed', top: 'calc(60px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '90%', maxWidth: '400px' }}>
          {toast.message}
        </div>
      )}

      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white' }}>
        <h2 style={{ margin: '0 0 5px 0' }}>🍻 Tasca do Gerês</h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Medidor oficial de estragos hepáticos</p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
          <button 
            onClick={() => setSubTab('leaderboard')}
            style={{ background: subTab === 'leaderboard' ? 'white' : 'rgba(255,255,255,0.2)', color: subTab === 'leaderboard' ? 'var(--accent)' : 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
          >
            🏆 Leaderboard
          </button>
          <button 
            onClick={() => setSubTab('putometros')}
            style={{ background: subTab === 'putometros' ? 'white' : 'rgba(255,255,255,0.2)', color: subTab === 'putometros' ? 'var(--accent)' : 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
          >
            📖 Tabela de Putómetros
          </button>
        </div>
      </div>

      {subTab === 'leaderboard' && (
        <>
          <div className="card">
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} color="var(--accent)" /> Registo de Consumos
            </h3>
            <form onSubmit={registarBebida}>
              <select
                className="input-field"
                value={selectedDrink}
                onChange={(e) => setSelectedDrink(e.target.value)}
                required
              >
                <option value="">Seleciona a bebida...</option>
                {tabelaPutometros.map((b) => (
                  <option key={b.id} value={b.nome}>
                    {b.icone} {b.nome} ({b.putometro} putómetros)
                  </option>
                ))}
              </select>

              <input
                className="input-field"
                type="number"
                min="1"
                max="20"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Quantidade"
                required
              />

              <button className="btn-primary" disabled={loading}>
                {loading ? 'A registar...' : 'Registar na Ficha de Cidadão'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={22} color="#eab308" /> Leaderboard de Putómetros
            </h3>

            {leaderboard.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                Ainda ninguém bebeu nada? Estão a ficar mornos. Registem a primeira rodada!
              </p>
            ) : (
              leaderboard.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', margin: '8px 0', background: index === 0 ? '#fef08a' : '#f8fafc', borderRadius: '12px', border: index === 0 ? '2px solid #eab308' : '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', width: '25px', textAlign: 'center' }}>
                      {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text)' }}>
                      @{item.username}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: index === 0 ? '#eab308' : 'var(--accent)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
                    <Flame size={16} />
                    <span>{item.totalPutometros} Pts</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* LISTA RECENTE DE CONSUMOS COM BOTÃO DE APAGAR */}
          <div className="card">
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>📜 Histórico de Consumos</h3>
            {drinks.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>Sem registos recentes.</p>
            ) : (
              drinks.map((drink) => (
                <div key={drink.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', marginBottom: '8px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--accent)' }}>@{drink.profiles?.username}</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text)' }}>
                      {drink.quantity}x {drink.drink_name}
                    </p>
                  </div>
                  {/* Botão para apagar este registo específico */}
                  <button 
                    onClick={() => apagarConsumo(drink.id)}
                    style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {subTab === 'putometros' && (
        <div className="card">
          <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color="var(--accent)" /> Dicionário do Putómetro
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '15px' }}>
            Cada unidade equivale ao dano estimado infligido ao sistema nervoso central por dose unitária.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tabelaPutometros.map((bebida) => (
              <div key={bebida.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>{bebida.icone}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text)' }}>{bebida.nome}</span>
                </div>
                <div style={{ background: '#ffedd5', color: 'var(--accent)', padding: '6px 12px', borderRadius: '12px', fontWeight: '800', fontSize: '14px' }}>
                  +{bebida.putometro} Pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}