import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Target, Trophy, CheckCircle, Circle, ShieldAlert, Zap, Gavel, ThumbsUp, Clock, RefreshCw } from 'lucide-react';

export default function Missoes({ session }) {
  const [subTab, setSubTab] = useState('diarios');
  const [dailyChallenges, setDailyChallenges] = useState([]);
  const [indicesHoje, setIndicesHoje] = useState([]);
  const [todayStr, setTodayStr] = useState('');
  
  const [myRequests, setMyRequests] = useState([]);
  const [tribunalRequests, setTribunalRequests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const [loadingAction, setLoadingAction] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  const todosDesafios = [
    "Dar um penálti na bebida que tens na mão agora.",
    "Fazer um brinde criativo em pé (mínimo 30 segundos).",
    "Tirar uma foto épica do grupo e publicar no Feed.",
    "Obrigar alguém a beber um copo de água cheio.",
    "Contar uma piada tão má que toda a gente tenha de beber.",
    "Servir uma rodada de bebidas a todos os que estão na mesma divisão.",
    "Fazer 15 flexões ou beber um shot de castigo.",
    "Falar com sotaque açoriano ou brasileiro durante 10 minutos.",
    "Esconder o isqueiro de alguém e deixá-lo à procura por 5 minutos.",
    "Ficar sem dizer a palavra 'beber' ou 'álcool' durante o dia.",
    "Cantar o refrão de uma música pimba aos berros.",
    "Trocar uma peça de roupa com a pessoa à tua direita.",
    "Tirar uma selfie a fingir que estás a dormir e meter no Feed.",
    "Ajudar na logística (ex: limpar uma mesa, lavar 5 copos ou varrer o chão).",
    "Beber do copo de outra pessoa sem ela reparar.",
    "Mergulhar na piscina (ou mandar alguém lá para dentro).",
    "Fazer uma declaração de amor muito sentida a uma jola.",
    "Andar de costas durante os próximos 5 minutos.",
    "Fazer o pino na parede (ou tentar) durante 10 segundos.",
    "Gravar um vídeo a imitar outro membro do grupo e pôr no Feed.",
    "Ligar à tua mãe/pai a dizer que os amas e desligar logo a seguir.",
    "Comer uma colher de sopa de algo picante ou nojento (ex: mostarda pura).",
    "Ficar a olhar fixamente para a parede durante 2 minutos sem rir.",
    "Elogiar exageradamente o organizador da viagem na frente de todos.",
    "Fazer uma massagem nos ombros da pessoa à tua esquerda.",
    "Vestir a tua t-shirt do avesso até ao fim do dia.",
    "Desafiar alguém para uma queda de braço. Quem perder, bebe.",
    "Inventar um cocktail com 3 bebidas diferentes e provar.",
    "Gritar 'BORA CARALHO' à janela para a vizinhança ouvir.",
    "Fingir que és um empregado de mesa e servir a próxima refeição/rodada.",
    "Tirar uma foto à pessoa mais bêbada e criar um meme no Feed.",
    "Dar 10 voltas sobre ti mesmo e tentar andar a direito.",
    "Deixar que o grupo te desenhe algo na testa com uma caneta (lavável).",
    "Beber um shot sem usar as mãos.",
    "Fazer de conta que não conheces alguém do grupo durante 15 minutos."
  ];

  useEffect(() => {
    const d = new Date();
    const str = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    setTodayStr(str);

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const i1 = hash % todosDesafios.length;
    const i2 = (hash + 17) % todosDesafios.length;
    const i3 = (hash + 31) % todosDesafios.length;
    
    setDailyChallenges([todosDesafios[i1], todosDesafios[i2], todosDesafios[i3]]);
    setIndicesHoje([i1, i2, i3]);

    carregarDados(str);

    const recarregarSeVisivel = () => {
      if (document.visibilityState === 'visible') {
        carregarDados(str);
      }
    };

    document.addEventListener('visibilitychange', recarregarSeVisivel);
    window.addEventListener('focus', recarregarSeVisivel);

    return () => {
      document.removeEventListener('visibilitychange', recarregarSeVisivel);
      window.removeEventListener('focus', recarregarSeVisivel);
    };
  }, []);

  async function carregarDados(dataHoje = todayStr) {
    setIsRefreshing(true);
    const { data: reqsData } = await supabase.from('challenge_requests').select('*');
    const { data: appsData } = await supabase.from('challenge_approvals').select('*');
    const { data: profsData } = await supabase.from('profiles').select('id, username');

    const fullRequests = (reqsData || []).map(req => {
      const perfil = (profsData || []).find(p => p.id === req.user_id);
      const approvals = (appsData || []).filter(a => a.request_id === req.id);
      return {
        ...req,
        username: perfil ? perfil.username : 'Membro',
        approvals: approvals,
        approvalCount: approvals.length
      };
    });

    const osMeus = fullRequests.filter(r => r.user_id === session.user.id && r.date_key === dataHoje);
    setMyRequests(osMeus);

    const tribunal = fullRequests.filter(r => r.user_id !== session.user.id && r.date_key === dataHoje && r.status === 'pending');
    setTribunalRequests(tribunal);

    const scores = {};
    fullRequests.filter(r => r.status === 'completed').forEach(registo => {
      if (!scores[registo.username]) scores[registo.username] = 0;
      scores[registo.username] += 1;
    });

    const rankingArray = Object.keys(scores)
      .map(user => ({ username: user, total: scores[user] }))
      .sort((a, b) => b.total - a.total);

    setLeaderboard(rankingArray);
    setIsRefreshing(false);
  }

  async function pedirAprovacao(localIndex) {
    setLoadingAction(`pedir-${localIndex}`);
    const globalIndexToSave = indicesHoje[localIndex];

    const { error } = await supabase.from('challenge_requests').insert([{
      user_id: session.user.id,
      date_key: todayStr,
      challenge_index: globalIndexToSave,
      status: 'pending'
    }]);

    if (error) {
      showToast(`Erro: ${error.message}`, 'error');
    } else {
      showToast('Pedido enviado para o Tribunal! Aguarda 3 aprovações. ⚖️', 'success');
      await carregarDados(todayStr);
    }
    setLoadingAction(null);
  }

  async function aprovarDesafio(request) {
    setLoadingAction(`aprovar-${request.id}`);

    const { error: insertError } = await supabase.from('challenge_approvals').insert([{
      request_id: request.id,
      approver_id: session.user.id
    }]);

    if (insertError) {
      showToast(`Já tinhas aprovado isto!`, 'error');
      setLoadingAction(null);
      return;
    }

    if (request.approvalCount + 1 >= 3) {
      await supabase.from('challenge_requests').update({ status: 'completed' }).eq('id', request.id);
      showToast('Aprovado! Essa pessoa acabou de ganhar 1 ponto! 🎯', 'success');
    } else {
      showToast(`Aprovado! Faltam ${3 - (request.approvalCount + 1)} votos. 👍`, 'success');
    }

    await carregarDados(todayStr);
    setLoadingAction(null);
  }

  return (
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      {toast.show && (
        <div className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'fixed', top: 'calc(60px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '90%', maxWidth: '400px' }}>
          {toast.message}
        </div>
      )}

      {/* BOTÃO DE REFRESH MANUAL NO TOPO */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
        <button onClick={() => carregarDados(todayStr)} disabled={isRefreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', padding: '8px 15px', borderRadius: '20px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <RefreshCw size={16} /> {isRefreshing ? 'A atualizar...' : 'Atualizar Missões'}
        </button>
      </div>

      {/* CABEÇALHO */}
      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white' }}>
        <h2 style={{ margin: '0 0 5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={26} /> Missões Diárias
        </h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Faz, pede aprovação à malta e ganha pontos.</p>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '15px' }}>
          <button 
            onClick={() => setSubTab('diarios')}
            style={{ background: subTab === 'diarios' ? 'white' : 'rgba(255,255,255,0.2)', color: subTab === 'diarios' ? 'var(--accent)' : 'white', border: 'none', padding: '8px 12px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
          >
            🎯 Hoje
          </button>
          <button 
            onClick={() => setSubTab('tribunal')}
            style={{ background: subTab === 'tribunal' ? 'white' : 'rgba(255,255,255,0.2)', color: subTab === 'tribunal' ? 'var(--accent)' : 'white', border: 'none', padding: '8px 12px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', position: 'relative' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⚖️ Tribunal
              {tribunalRequests.length > 0 && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', marginLeft: '4px' }}>
                  {tribunalRequests.length}
                </span>
              )}
            </span>
          </button>
          <button 
            onClick={() => setSubTab('leaderboard')}
            style={{ background: subTab === 'leaderboard' ? 'white' : 'rgba(255,255,255,0.2)', color: subTab === 'leaderboard' ? 'var(--accent)' : 'white', border: 'none', padding: '8px 12px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
          >
            🏆 Ranking
          </button>
        </div>
      </div>

      {/* ABA: DESAFIOS DE HOJE */}
      {subTab === 'diarios' && (
        <div className="card">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color="var(--accent)" /> Os Teus Desafios
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dailyChallenges.map((desafio, localIndex) => {
              const globalIndex = indicesHoje[localIndex];
              const meuRegisto = myRequests.find(r => r.challenge_index === globalIndex);
              const isCompleted = meuRegisto?.status === 'completed';
              const isPending = meuRegisto?.status === 'pending';
              const isLoading = loadingAction === `pedir-${localIndex}`;

              return (
                <div key={localIndex} style={{ 
                  background: isCompleted ? '#f0fdf4' : isPending ? '#fefce8' : '#f8fafc', 
                  border: isCompleted ? '2px solid #22c55e' : isPending ? '2px solid #eab308' : '1px solid #e2e8f0', 
                  borderRadius: '12px', padding: '15px', transition: 'all 0.3s'
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '2px' }}>
                      {isCompleted ? <CheckCircle size={24} color="#22c55e" /> : isPending ? <Clock size={24} color="#eab308" /> : <Circle size={24} color="#94a3b8" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--text)', fontWeight: isCompleted ? 'normal' : '500', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                        {desafio}
                      </p>
                      
                      {!meuRegisto && (
                        <button 
                          className="btn-primary"
                          onClick={() => pedirAprovacao(localIndex)}
                          disabled={isLoading}
                          style={{ margin: 0, padding: '10px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px' }}
                        >
                          <Zap size={18} /> {isLoading ? 'A pedir...' : 'Já fiz! (Pedir Aprovação)'}
                        </button>
                      )}

                      {isPending && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef08a', color: '#854d0e', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                          <Clock size={16} /> A aguardar aprovação ({meuRegisto.approvalCount}/3)
                        </div>
                      )}

                      {isCompleted && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                          <CheckCircle size={16} /> Feito e Aprovado! ✅
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA: TRIBUNAL */}
      {subTab === 'tribunal' && (
        <div className="card">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gavel size={20} color="var(--accent)" /> Tribunal da Tasca
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '15px' }}>
            Votação pública. Se a pessoa mentiu, não aproves. São precisos 3 votos para validar.
          </p>

          {tribunalRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '30px', display: 'block', marginBottom: '10px' }}>⚖️</span>
              <p style={{ margin: 0, color: 'var(--text-dim)' }}>O tribunal está limpo. Não há pendentes.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tribunalRequests.map(req => {
                const jaAprovei = req.approvals.some(a => a.approver_id === session.user.id);
                const isLoading = loadingAction === `aprovar-${req.id}`;
                const textDesafio = todosDesafios[req.challenge_index];

                return (
                  <div key={req.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>@{req.username}</span>
                      <span style={{ fontSize: '12px', background: '#e2e8f0', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                        {req.approvalCount}/3 Votos
                      </span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontStyle: 'italic', color: 'var(--text)' }}>
                      "{textDesafio}"
                    </p>
                    
                    {jaAprovei ? (
                      <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '8px', borderRadius: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                        Tu já votaste a favor! 👍
                      </div>
                    ) : (
                      <button 
                        onClick={() => aprovarDesafio(req)}
                        disabled={isLoading}
                        style={{ width: '100%', background: '#22c55e', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                      >
                        <ThumbsUp size={18} /> {isLoading ? 'A gravar...' : 'Aprovar Desafio'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA: LEADERBOARD */}
      {subTab === 'leaderboard' && (
        <div className="card">
          <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={22} color="#eab308" /> Hall da Fama das Missões
          </h3>

          {leaderboard.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
              Ninguém aprovou nada a ninguém. Tudo a zeros!
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
                  <Target size={16} />
                  <span>{item.total} Pts</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}