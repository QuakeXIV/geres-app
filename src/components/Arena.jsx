import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Swords, Trophy, Plus, Minus, Flag, Activity, Crown, Trash2 } from 'lucide-react';

export default function Arena({ session }) {
  const [subTab, setSubTab] = useState('marcador');
  
  const [games, setGames] = useState([]);
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  
  const [tournaments, setTournaments] = useState([]);
  const [tourneyName, setTourneyName] = useState('');
  const [tourneyPlayers, setTourneyPlayers] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  useEffect(() => {
    carregarDados();
    const interval = setInterval(() => {
      if (subTab === 'marcador') carregarJogos(false);
      if (subTab === 'torneios') carregarTorneios(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [subTab]);

  async function carregarDados() {
    setLoading(true);
    await carregarJogos(false);
    await carregarTorneios(false);
    setLoading(false);
  }

  async function carregarJogos(showLoader = true) {
    if (showLoader) setLoading(true);
    const { data, error } = await supabase.from('arena_games').select('*').eq('game_type', 'quick').order('status', { ascending: true }).order('created_at', { ascending: false });
    if (!error) setGames(data || []);
    if (showLoader) setLoading(false);
  }

  async function criarJogo(e) {
    e.preventDefault();
    if (!team1 || !team2) return showToast('Preenche o nome das equipas!', 'error');

    setLoading(true);
    const { error } = await supabase.from('arena_games').insert([{ created_by: session.user.id, team1_name: team1, team2_name: team2, status: 'live' }]);

    if (!error) {
      setTeam1(''); setTeam2('');
      showToast('Jogo começou! 🎮', 'success');
      await carregarJogos();
    } else {
      showToast(`Erro: ${error.message}`, 'error');
    }
    setLoading(false);
  }

  async function atualizarScore(id, team, currentScore, change) {
    const novoScore = Math.max(0, currentScore + change);
    await supabase.from('arena_games').update(team === 1 ? { score1: novoScore } : { score2: novoScore }).eq('id', id);
    carregarJogos(false);
  }

  function pedirTerminarJogo(id) {
    setConfirmModal({
      show: true, title: 'Terminar Jogo?', message: 'O jogo vai para o histórico e o resultado fica bloqueado.',
      onConfirm: async () => {
        await supabase.from('arena_games').update({ status: 'finished' }).eq('id', id);
        showToast('Jogo terminado!', 'success');
        carregarJogos();
        setConfirmModal({ show: false });
      }
    });
  }

  async function carregarTorneios(showLoader = true) {
    if (showLoader) setLoading(true);
    const { data, error } = await supabase.from('arena_tournaments').select('*').order('status', { ascending: true }).order('created_at', { ascending: false });
    if (!error) setTournaments(data || []);
    if (showLoader) setLoading(false);
  }

  async function criarTorneio(e) {
    e.preventDefault();
    const playersList = tourneyPlayers.split('\n').map(p => p.trim()).filter(p => p !== '');
    if (playersList.length < 3 || playersList.length > 8) return showToast('Insere entre 3 a 8 jogadores (um por linha)', 'error');

    setLoading(true);
    let players = playersList.sort(() => Math.random() - 0.5);
    const target = players.length <= 4 ? 4 : 8;
    while (players.length < target) players.push("BYE");

    const numRounds = Math.log2(target);
    const rounds = [];
    
    for (let r = 0; r < numRounds; r++) {
      const roundMatches = [];
      const numMatches = target / Math.pow(2, r + 1);
      for (let m = 0; m < numMatches; m++) {
        if (r === 0) roundMatches.push({ p1: players[m*2], p2: players[m*2+1], winner: null });
        else roundMatches.push({ p1: null, p2: null, winner: null });
      }
      rounds.push(roundMatches);
    }

    rounds[0].forEach((match, idx) => {
      if (match.p1 === "BYE") { match.winner = match.p2; if(rounds[1]) setSlot(rounds, 1, idx, match.p2); }
      else if (match.p2 === "BYE") { match.winner = match.p1; if(rounds[1]) setSlot(rounds, 1, idx, match.p1); }
    });

    const { error } = await supabase.from('arena_tournaments').insert([{ created_by: session.user.id, name: tourneyName, rounds: rounds, status: 'active' }]);
    
    if (!error) {
      setTourneyName(''); setTourneyPlayers('');
      showToast('Chave do Torneio gerada! 🏆', 'success');
      await carregarTorneios();
    } else {
      showToast(`Erro: ${error.message}`, 'error');
    }
    setLoading(false);
  }

  function setSlot(roundsArray, roundIdx, prevMatchIdx, winnerName) {
    const nextMatchIdx = Math.floor(prevMatchIdx / 2);
    const isSlot1 = prevMatchIdx % 2 === 0;
    if (isSlot1) roundsArray[roundIdx][nextMatchIdx].p1 = winnerName;
    else roundsArray[roundIdx][nextMatchIdx].p2 = winnerName;
  }

  async function avancarVencedor(tourneyId, currentRounds, roundIdx, matchIdx, vencedor) {
    if (!vencedor || vencedor === "BYE") return;
    
    const newRounds = JSON.parse(JSON.stringify(currentRounds));
    newRounds[roundIdx][matchIdx].winner = vencedor;

    if (roundIdx + 1 < newRounds.length) setSlot(newRounds, roundIdx + 1, matchIdx, vencedor);

    const isFinal = roundIdx === newRounds.length - 1;
    await supabase.from('arena_tournaments').update({ rounds: newRounds, status: isFinal ? 'finished' : 'active' }).eq('id', tourneyId);
    
    if (isFinal) showToast(`${vencedor} é o Campeão! 👑`, 'success');
    carregarTorneios(false);
  }

  function pedirApagarTorneio(id) {
    setConfirmModal({
      show: true, title: 'Apagar Torneio?', message: 'Vai tudo para o lixo. Não há volta a dar.',
      onConfirm: async () => {
        await supabase.from('arena_tournaments').delete().eq('id', id);
        showToast('Torneio apagado!', 'success');
        carregarTorneios();
        setConfirmModal({ show: false });
      }
    });
  }

  return (
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      {toast.show && (
        <div className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'fixed', top: 'calc(60px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '90%', maxWidth: '400px' }}>
          {toast.message}
        </div>
      )}

      {/* CABEÇALHO OFICIAL COM AS CORES DA APP */}
      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white' }}>
        <h2 style={{ margin: '0 0 5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <Swords size={26} color="white" /> Arena de Jogos
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>Onde as amizades vêm para morrer.</p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
          <button onClick={() => setSubTab('marcador')} style={{ background: subTab === 'marcador' ? 'white' : 'rgba(255,255,255,0.2)', color: subTab === 'marcador' ? 'var(--accent)' : 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>
            🎯 Marcador Rápido
          </button>
          <button onClick={() => setSubTab('torneios')} style={{ background: subTab === 'torneios' ? 'white' : 'rgba(255,255,255,0.2)', color: subTab === 'torneios' ? 'var(--accent)' : 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>
            🏆 Torneios (Knockout)
          </button>
        </div>
      </div>

      {/* -------------------- MODO 1: MARCADOR RÁPIDO -------------------- */}
      {subTab === 'marcador' && (
        <>
          <div className="card">
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="var(--accent)" /> Novo Jogo Rápido
            </h3>
            <form onSubmit={criarJogo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                <input type="text" placeholder="Equipa A" value={team1} onChange={(e) => setTeam1(e.target.value)} style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box', textAlign: 'center', fontSize: '15px' }} required />
                <span style={{ fontWeight: '900', color: 'var(--text-dim)', fontSize: '14px' }}>VS</span>
                <input type="text" placeholder="Equipa B" value={team2} onChange={(e) => setTeam2(e.target.value)} style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box', textAlign: 'center', fontSize: '15px' }} required />
              </div>
              <button className="btn-primary" disabled={loading} style={{ background: 'var(--accent)', width: '100%', margin: 0 }}>
                {loading ? 'A preparar...' : 'Começar Jogo'}
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {games.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px', margin: '20px 0' }}>Nenhum jogo a decorrer.</p>
            ) : (
              games.map((game) => (
                <div key={game.id} className="card" style={{ padding: '0', overflow: 'hidden', border: game.status === 'live' ? '2px solid var(--accent)' : '1px solid #e2e8f0', opacity: game.status === 'live' ? 1 : 0.6 }}>
                  <div style={{ background: game.status === 'live' ? '#ffedd5' : '#f8fafc', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {game.status === 'live' ? <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }}></span> : <Flag size={16} color="#64748b" />}
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: game.status === 'live' ? 'var(--accent)' : '#64748b', textTransform: 'uppercase' }}>{game.status === 'live' ? 'Em Direto' : 'Terminado'}</span>
                    </div>
                    {game.status === 'live' && (
                      <button onClick={() => pedirTerminarJogo(game.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Finalizar</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}>
                    <div style={{ flex: 1, padding: '20px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--text)' }}>{game.team1_name}</h4>
                      <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--text)', lineHeight: '1' }}>{game.score1}</div>
                      {game.status === 'live' && (
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
                          <button onClick={() => atualizarScore(game.id, 1, game.score1, -1)} style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer' }}><Minus size={20} color="#64748b" /></button>
                          <button onClick={() => atualizarScore(game.id, 1, game.score1, 1)} style={{ background: 'var(--accent)', border: 'none', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', color: 'white' }}><Plus size={20} /></button>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, padding: '20px', textAlign: 'center' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--text)' }}>{game.team2_name}</h4>
                      <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--text)', lineHeight: '1' }}>{game.score2}</div>
                      {game.status === 'live' && (
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
                          <button onClick={() => atualizarScore(game.id, 2, game.score2, -1)} style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer' }}><Minus size={20} color="#64748b" /></button>
                          <button onClick={() => atualizarScore(game.id, 2, game.score2, 1)} style={{ background: 'var(--accent)', border: 'none', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', color: 'white' }}><Plus size={20} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* -------------------- MODO 2: TORNEIOS -------------------- */}
      {subTab === 'torneios' && (
        <>
          <div className="card">
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="var(--accent)" /> Criar Torneio
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>Coloca o nome dos jogadores/equipas (um por linha). Sorteio é automático.</p>
            <form onSubmit={criarTorneio} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Nome do Torneio (ex: Taça de Sueca)" value={tourneyName} onChange={(e) => setTourneyName(e.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} required />
              <textarea placeholder="Diogo&#10;João&#10;Pedro&#10;Zé" rows="4" value={tourneyPlayers} onChange={(e) => setTourneyPlayers(e.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', resize: 'none' }} required />
              <button className="btn-primary" disabled={loading} style={{ background: 'var(--accent)', width: '100%', color: 'white' }}>{loading ? 'A gerar...' : 'Gerar Chave (Sorteio)'}</button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {tournaments.map((tourney) => {
              const totalRounds = tourney.rounds.length;
              return (
                <div key={tourney.id} className="card" style={{ padding: 0, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ background: tourney.status === 'active' ? '#ffedd5' : '#f8fafc', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '18px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {tourney.status === 'finished' && <Crown size={18} color="var(--accent)" />} {tourney.name}
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{tourney.status === 'active' ? 'Em Progresso' : 'Terminado'}</span>
                    </div>
                    <button onClick={() => pedirApagarTorneio(tourney.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px' }}>
                      <Trash2 size={18} color="#ef4444" opacity={tourney.status === 'active' ? 0.3 : 1} />
                    </button>
                  </div>

                  <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {tourney.rounds.map((roundMatches, rIdx) => {
                      let roundName = `Ronda ${rIdx + 1}`;
                      if (rIdx === totalRounds - 1) roundName = "A Grande Final";
                      else if (rIdx === totalRounds - 2) roundName = "Meias-Finais";
                      else if (rIdx === totalRounds - 3) roundName = "Quartos-de-Final";

                      return (
                        <div key={rIdx}>
                          <h5 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '1px dashed #cbd5e1', paddingBottom: '4px' }}>
                            {roundName}
                          </h5>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                            {roundMatches.map((match, mIdx) => {
                              const p1 = match.p1 || '???';
                              const p2 = match.p2 || '???';
                              const p1Win = match.winner === p1;
                              const p2Win = match.winner === p2;
                              const canVote = tourney.status === 'active' && !match.winner && match.p1 && match.p2 && match.p1 !== 'BYE' && match.p2 !== 'BYE';

                              if (match.p1 === 'BYE' || match.p2 === 'BYE') return null;

                              return (
                                <div key={mIdx} style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', opacity: match.winner ? 0.7 : 1 }}>
                                  <div 
                                    onClick={() => canVote && avancarVencedor(tourney.id, tourney.rounds, rIdx, mIdx, p1)}
                                    style={{ flex: 1, padding: '10px', textAlign: 'center', background: p1Win ? '#ffedd5' : '#f8fafc', fontWeight: p1Win ? 'bold' : 'normal', color: p1Win ? 'var(--accent)' : 'var(--text)', cursor: canVote ? 'pointer' : 'default', borderRight: '1px solid #e2e8f0', transition: 'background 0.2s' }}
                                  >
                                    {p1}
                                  </div>
                                  <div style={{ background: '#f1f5f9', width: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: 'var(--text-dim)' }}>VS</div>
                                  <div 
                                    onClick={() => canVote && avancarVencedor(tourney.id, tourney.rounds, rIdx, mIdx, p2)}
                                    style={{ flex: 1, padding: '10px', textAlign: 'center', background: p2Win ? '#ffedd5' : '#f8fafc', fontWeight: p2Win ? 'bold' : 'normal', color: p2Win ? 'var(--accent)' : 'var(--text)', cursor: canVote ? 'pointer' : 'default', borderLeft: '1px solid #e2e8f0', transition: 'background 0.2s' }}
                                  >
                                    {p2}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {tourney.status === 'finished' && (
                      <div style={{ background: '#ffedd5', border: '1px solid var(--accent)', borderRadius: '12px', padding: '15px', textAlign: 'center', marginTop: '10px' }}>
                        <Crown size={30} color="var(--accent)" style={{ margin: '0 auto 5px auto' }} />
                        <h4 style={{ margin: 0, color: '#9a3412', fontSize: '14px' }}>Grande Vencedor</h4>
                        <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: '900', color: 'var(--accent)' }}>{tourney.rounds[totalRounds - 1][0].winner}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MODAL CUSTOMIZADO */}
      {confirmModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '320px', textAlign: 'center', margin: 0, padding: '25px 20px', animation: 'scaleIn 0.2s ease-out' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: 'var(--text)' }}>{confirmModal.title}</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: '0 0 20px 0' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmModal({ show: false })} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: 'var(--text)', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmModal.onConfirm} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}