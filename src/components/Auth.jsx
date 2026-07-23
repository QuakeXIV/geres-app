import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Eye, EyeOff, Sun } from 'lucide-react';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // O NOSSO NOVO AVISO CUSTOMIZADO (em vez do alert)
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Função para disparar o aviso e apagá-lo ao fim de 3 segundos
  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        showToast(error.message, 'error'); // Usa o nosso toast vermelho
      } else {
        await supabase.from('profiles').insert([{ id: data.user.id, username }]);
        showToast('Conta criada! Já podes entrar.', 'success'); // Usa o nosso toast verde
        setIsSignUp(false); // Muda automaticamente para a janela de Login
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showToast(error.message, 'error');
      }
    }
    setLoading(false);
  }

  return (
    <div className="card" style={{ marginTop: '40px' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <Sun size={40} color="var(--accent)" style={{ marginBottom: '10px' }} />
        <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: '28px' }}>Gerês 2k26</h2>
        <p style={{ margin: '5px 0', color: 'var(--text-dim)' }}>
          {isSignUp ? 'Cria a tua conta para a viagem' : 'Entra na App do Grupo'}
        </p>
      </div>

      {/* A CAIXA DO AVISO CUSTOMIZADO APARECE AQUI */}
      {toast.show && (
        <div className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
      
      <form onSubmit={handleAuth}>
        {isSignUp && (
          <input
            className="input-field"
            type="text"
            placeholder="O teu Nome/Alcunha"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        
        <input
          className="input-field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <div style={{ position: 'relative', margin: '8px 0' }}>
          <input
            className="input-field"
            type={showPassword ? "text" : "password"}
            placeholder="Palavra-passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ margin: 0, paddingRight: '40px' }}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button className="btn-primary" disabled={loading}>
          {loading ? 'A carregar...' : isSignUp ? 'Registar' : 'Entrar'}
        </button>
      </form>

      <p style={{ fontSize: '14px', textAlign: 'center', marginTop: '20px', color: 'var(--text-dim)' }}>
        {isSignUp ? 'Já tens conta?' : 'Ainda não tens conta?'}{' '}
        <span
          style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
          onClick={() => {
            setIsSignUp(!isSignUp);
            setToast({ show: false, message: '', type: '' }); // Limpa avisos ao trocar de ecrã
          }}
        >
          {isSignUp ? 'Fazer Login' : 'Registar aqui'}
        </span>
      </p>
    </div>
  );
}