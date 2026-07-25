import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Target, Trophy, CheckCircle, Circle, ShieldAlert, Zap } from 'lucide-react';

export default function Missoes({ session }) {
  const [subTab, setSubTab] = useState('diarios');
  const [dailyChallenges, setDailyChallenges] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [todayStr, setTodayStr] = useState('');
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  // LISTA GIGANTE DE DESAFIOS
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
    "Ficar sem dizer a palavra 'beber' ou 'álcool' durante 1 hora.",
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

    const index1 = hash % todosDesafios.length;
    const index2 = (hash + 17) % todosDesafios.length;
    const index3 = (hash + 31) % todosDesafios.length;
    
    setDailyChallenges([
      todosDesafios[index1], 
      todosDesafios[index2], 
      todosDesafios[index3]
    ]);

    setCompletedToday([]); 
    carregarDados(str, [index1, index2, index3]);
  }, []);

  async function carregarDados(dataHoje, indicesDeHoje) {
    const { data: recordsData, error: recordsError } = await supabase
      .from('completed_challenges')
      .select('*');

    if (recordsError) return showToast(`Erro: ${recordsError.message}`, 'error');

    const { data: profilesData } = await supabase.from('profiles').select('id, username');

    const meusHoje = (recordsData || [])
      .filter(r => r.user_id === session.user.id && r.date_key === dataHoje)
      .map(r => r.challenge_index);
    
    const completadosLocal = [];
    if (indicesDeHoje) {
      if (meusHoje.includes(indicesDeHoje[0])) completadosLocal.push(0);
      if (meusHoje.includes(indicesDeHoje[1])) completadosLocal.push(1);
      if (meusHoje.includes(indicesDeHoje[2])) completadosLocal.push(2);
      setCompletedToday(completadosLocal);
    }

    const scores = {};
    (recordsData || []).forEach(registo => {
      const perfil = (profilesData || []).find(p => p.id === registo.user_id);
      const username = perfil ? perfil.username : 'Anónimo';
      
      if (!scores[username]) scores[username] = 0;
      scores[username] += 1;
    });

    const rankingArray = Object.keys(scores)
      .map(user => ({ username: user, total: scores[user] }))
      .sort((a, b) => b.total - a.total);

    setLeaderboard(rankingArray);
  }

  async function concluirDesafio(localIndex) {
    setLoadingIndex(localIndex);

    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
      hash = todayStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const indicesGlobais = [
      hash % todosDesafios.length,
      (hash + 17) % todosDesafios.length,
      (hash + 31) % todosDesafios.length
    ];

    const globalIndexToSave = indicesGlobais[localIndex];

    const { error } = await supabase.from('completed_challenges').insert([{
      user_id: session.user.id,
      date_key: todayStr,
      challenge_index: globalIndexToSave
    }]);

    if (error) {
      if (error.code === '23505') {
        showToast('Já completaste este desafio hoje, seu batoteiro!', 'error');
      } else {
        showToast(`Erro: ${error.message}`, 'error');
      }
    } else {
      showToast('Desafio cumprido! +1 Ponto 🎯', 'success');
      await carregarDados(todayStr, indicesGlobais);
    }
    setLoadingIndex(null);
  }

  return (
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      {toast.show && (
        <div className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'fixed', top: 'calc(60px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '90%', maxWidth: '400px' }}>
          {toast.message}
        </div>
      )}

      {/* CABEÇALHO (Estilo Tasca mas versão Missões) */}
      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white' }}>
        <h2 style={{ margin: '0 0 5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={26} /> Missões Diárias
        </h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>As missões mudam todos os dias. Cumpre ou chora.</p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
          <button 
            onClick={() => setSubTab('diarios')}
            style={{ background: subTab === 'diarios' ? 'white' : 'rgba(255,255,255,0.2)', color: subTab === 'diarios' ? '#2563eb' : 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}
          >
            🎯 Hoje
          </button>
          <button 
            onClick={() => setSubTab('leaderboard')}
            style={{ background: subTab === 'leaderboard' ? 'white' : 'rgba(255,255,255,0.2)', color: subTab === 'leaderboard' ? '#2563eb' : 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}
          >
            🏆 Ranking de Bravos
          </button>
        </div>
      </div>

      {subTab === 'diarios' && (
        <div className="card">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color="#2563eb" /> Desafios de Hoje
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px' }}>
            Toda a casa tem as mesmas missões. Quem fizer primeiro, ganha o direito de se gabar.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dailyChallenges.map((desafio, index) => {
              const isCompleted = completedToday.includes(index);
              const isLoading = loadingIndex === index;

              return (
                <div key={index} style={{ 
                  background: isCompleted ? '#f0fdf4' : '#f8fafc', 
                  border: isCompleted ? '2px solid #22c55e' : '1px solid #e2e8f0', 
                  borderRadius: '12px', padding: '15px', position: 'relative', overflow: 'hidden', transition: 'all 0.3s'
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '2px' }}>
                      {isCompleted ? <CheckCircle size={24} color="#22c55e" /> : <Circle size={24} color="#94a3b8" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--text)', fontWeight: isCompleted ? 'normal' : '500', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                        {desafio}
                      </p>
                      
                      {!isCompleted ? (
                        <button 
                          className="btn-primary"
                          onClick={() => concluirDesafio(index)}
                          disabled={isLoading}
                          style={{ background: '#2563eb', margin: 0, padding: '10px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px' }}
                        >
                          <Zap size={18} /> {isLoading ? 'A confirmar...' : 'Completar Desafio'}
                        </button>
                      ) : (
                        <div style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                          Feito! ✅
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

      {subTab === 'leaderboard' && (
        <div className="card">
          <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={22} color="#eab308" /> Hall da Fama das Missões
          </h3>

          {leaderboard.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
              Ninguém completou desafios. Cambada de medrosos.
            </p>
          ) : (
            leaderboard.map((item, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', margin: '8px 0', background: index === 0 ? '#eff6ff' : '#f8fafc', borderRadius: '12px', border: index === 0 ? '2px solid #2563eb' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', width: '25px', textAlign: 'center' }}>
                    {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                  <span style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text)' }}>
                    @{item.username}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: index === 0 ? '#2563eb' : '#64748b', color: 'white', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
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