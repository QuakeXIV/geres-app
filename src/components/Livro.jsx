import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MessageSquareQuote, PenTool, Trash2, BookOpen } from 'lucide-react';

export default function Livro({ session }) {
  const [quotes, setQuotes] = useState([]);
  const [novaCitacao, setNovaCitacao] = useState('');
  const [autorCitacao, setAutorCitacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // NOVO ESTADO PARA O MODAL
  const [quoteToDelete, setQuoteToDelete] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  useEffect(() => {
    carregarQuotes();
  }, []);

  async function carregarQuotes() {
    const { data: quotesData, error } = await supabase
      .from('tasca_quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro a puxar o livro:", error);
      return;
    }

    const { data: profilesData } = await supabase.from('profiles').select('id, username');

    const quotesComPerfis = (quotesData || []).map(quote => {
      const perfil = (profilesData || []).find(p => p.id === quote.user_id);
      return { ...quote, profiles: perfil || { username: 'Membro' } };
    });

    setQuotes(quotesComPerfis);
  }

  async function registarOcorrencia(e) {
    e.preventDefault();
    if (!novaCitacao || !autorCitacao) return showToast('Preenche os dois campos!', 'error');

    setLoading(true);
    const { error } = await supabase.from('tasca_quotes').insert([{
      user_id: session.user.id,
      quote: novaCitacao,
      author: autorCitacao
    }]);

    if (error) {
      showToast(`Erro ao gravar: ${error.message}`, 'error');
    } else {
      showToast('Pérola eternizada no livro! 📜', 'success');
      setNovaCitacao('');
      setAutorCitacao('');
      await carregarQuotes();
    }
    setLoading(false);
  }

  // NOVA FUNÇÃO PARA CONFIRMAR O APAGAR
  async function confirmarApagarOcorrencia() {
    if (!quoteToDelete) return;
    
    const { error } = await supabase.from('tasca_quotes').delete().eq('id', quoteToDelete);
    if (!error) {
      showToast('Ocorrência apagada!', 'success');
      setQuoteToDelete(null); // Fecha o modal
      await carregarQuotes();
    } else {
      showToast(`Erro: ${error.message}`, 'error');
    }
  }

  return (
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      {toast.show && (
        <div className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'fixed', top: 'calc(60px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '90%', maxWidth: '400px' }}>
          {toast.message}
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: 'white' }}>
        <h2 style={{ margin: '0 0 5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={26} /> Livro de Ocorrências
        </h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>As calinadas e pérolas da viagem ficam aqui.</p>
      </div>

      {/* FORMULÁRIO */}
      <div className="card">
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PenTool size={20} color="#d97706" /> Registar Pérola
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '15px' }}>
          Alguém disse uma barbaridade? Regista para a posteridade.
        </p>
        <form onSubmit={registarOcorrencia}>
          <textarea 
            className="input-field" 
            rows="3" 
            placeholder='Ex: "Amanhã acordo às 8h para correr..."'
            value={novaCitacao}
            onChange={(e) => setNovaCitacao(e.target.value)}
            style={{ resize: 'none', padding: '12px' }}
            required
          />
          <input 
            className="input-field" 
            type="text" 
            placeholder="Quem foi o artista? (Ex: João)"
            value={autorCitacao}
            onChange={(e) => setAutorCitacao(e.target.value)}
            required
          />
          <button className="btn-primary" disabled={loading} style={{ background: '#d97706', width: '100%' }}>
            {loading ? 'A registar...' : 'Eternizar no Livro'}
          </button>
        </form>
      </div>

      {/* LISTA DE CITAÇÕES */}
      <div className="card">
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquareQuote size={20} color="#d97706" /> O Livro Sagrado
        </h3>
        {quotes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
            Ainda não há citações míticas. A malta está muito calada!
          </p>
        ) : (
          quotes.map((quote) => (
            <div key={quote.id} style={{ position: 'relative', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px', marginBottom: '15px', boxShadow: '2px 4px 10px rgba(0,0,0,0.05)' }}>
              <MessageSquareQuote size={24} color="#f59e0b" style={{ position: 'absolute', top: '15px', right: '15px', opacity: 0.3 }} />
              <p style={{ margin: '0 0 15px 0', fontSize: '16px', fontStyle: 'italic', fontWeight: '500', color: '#451a03', lineHeight: '1.4' }}>
                "{quote.quote}"
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: '#b45309', fontSize: '14px' }}>— {quote.author}</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#92400e' }}>
                    Registado por @{quote.profiles?.username}
                  </p>
                </div>
                {/* ABRIR MODAL EM VEZ DE ALERT */}
                {quote.user_id === session.user.id && (
                  <button onClick={() => setQuoteToDelete(quote.id)} style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', zIndex: 10 }}>
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

     {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO CORRIGIDO */}
      {quoteToDelete && (
        <div style={{
          position: 'fixed', 
          top: 0, left: 0, right: 0, bottom: 0, /* Prende a todos os cantos do ecrã */
          background: 'rgba(0,0,0,0.6)', 
          backdropFilter: 'blur(5px)', 
          WebkitBackdropFilter: 'blur(5px)', /* Suporte extra para iPhone */
          zIndex: 99999, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '20px',
          boxSizing: 'border-box' /* Impede que margens estraguem o flex */
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '320px', textAlign: 'center', margin: 0, padding: '25px 20px', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ background: '#fef3c7', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
              <Trash2 size={24} color="#d97706" />
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#92400e' }}>Apagar Pérola?</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: '0 0 20px 0' }}>
              Tens a certeza que queres apagar isto do Livro Sagrado? Não há volta a dar.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={() => setQuoteToDelete(null)} 
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: 'var(--text)', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarApagarOcorrencia} 
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}
              >
                Sim, Apagar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}