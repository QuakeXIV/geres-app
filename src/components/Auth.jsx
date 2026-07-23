import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // Criar Conta
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else {
        // Criar perfil do utilizador
        await supabase.from('profiles').insert([{ id: data.user.id, username }]);
        alert('Conta criada com sucesso! Já podes entrar.');
      }
    } else {
      // Fazer Login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    setLoading(false);
  }

  return (
    <div className="card" style={{ marginTop: '50px' }}>
      <h2>🌲 Gerês 2k26</h2>
      <p>{isSignUp ? 'Cria a tua conta de membro' : 'Entra na App do Grupo'}</p>
      
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
        <input
          className="input-field"
          type="password"
          placeholder="Palavra-passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn-primary" disabled={loading}>
          {loading ? 'A carregar...' : isSignUp ? 'Registar' : 'Entrar'}
        </button>
      </form>

      <p style={{ fontSize: '13px', textAlign: 'center', marginTop: '15px' }}>
        {isSignUp ? 'Já tens conta?' : 'Ainda não tens conta?'}{' '}
        <span
          style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? 'Fazer Login' : 'Registar aqui'}
        </span>
      </p>
    </div>
  );
}