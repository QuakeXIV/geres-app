import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Eye, EyeOff, Sun, Camera, Bell, User } from 'lucide-react';
import OneSignal from 'react-onesignal';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Novos estados para a Foto e Notificações no Registo
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [enablePush, setEnablePush] = useState(true); // Vem ativado por defeito

  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 4000);
  }

  // Lida com a pré-visualização da foto escolhida
  function handleAvatarChange(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      if (!username.trim()) {
        showToast('Tens de preencher o teu nome/alcunha!', 'error');
        setLoading(false);
        return;
      }

      // 1. Criar a conta no Supabase
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        showToast(error.message, 'error');
        setLoading(false);
        return;
      }

      if (data?.user) {
        let finalAvatarUrl = null;

        // 2. Se a pessoa escolheu foto, fazemos logo o Upload
        if (avatarFile) {
          showToast('A guardar a tua foto...', 'success');
          const fileExt = avatarFile.name.split('.').pop();
          const filePath = `avatars/${data.user.id}-${Math.random()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage.from('media').upload(filePath, avatarFile);
          
          if (!uploadError) {
            const { data: publicData } = supabase.storage.from('media').getPublicUrl(filePath);
            finalAvatarUrl = publicData.publicUrl;
          }
        }

        // 3. Registar o Perfil com o Nome e a Foto (se existir)
        await supabase.from('profiles').insert([{ 
          id: data.user.id, 
          username: username,
          avatar_url: finalAvatarUrl 
        }]);

        // 4. Pedir notificações se a pessoa deixou o "Toggle" ligado
        if (enablePush) {
          try {
            if (OneSignal.Slidedown) await OneSignal.Slidedown.promptPush();
            if (OneSignal.User && OneSignal.User.PushSubscription) {
               await OneSignal.User.PushSubscription.optIn();
            } else if (OneSignal.isPushNotificationsEnabled) {
               await OneSignal.setSubscription(true);
            }
          } catch (err) {
            console.log("Erro ao ativar notificações no registo:", err);
          }
        }

        showToast('Conta criada com sucesso! 🚀', 'success');
        
        // Se a app não fizer login automático (depende da config do teu Supabase), 
        // limpamos o formulário e mandamos para o ecrã de entrar.
        setIsSignUp(false);
        setAvatarFile(null);
        setAvatarPreview(null);
      }
    } else {
      // LÓGICA DE LOGIN NORMAL
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showToast(error.message, 'error');
      }
    }
    setLoading(false);
  }

  return (
    <div className="card" style={{ marginTop: '40px', maxWidth: '400px', width: '90%', margin: '40px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <Sun size={40} color="var(--accent)" style={{ marginBottom: '10px' }} />
        <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '28px' }}>Gerês 2k26</h2>
        <p style={{ margin: '5px 0', color: 'var(--text-dim)' }}>
          {isSignUp ? 'Cria a tua conta para a viagem' : 'Entra na App do Grupo'}
        </p>
      </div>

      {toast.show && (
        <div className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '90%', maxWidth: '400px' }}>
          {toast.message}
        </div>
      )}
      
      <form onSubmit={handleAuth}>
        
        {/* CAMPOS EXCLUSIVOS DO REGISTO */}
        {isSignUp && (
          <div style={{ animation: 'slideDown 0.3s ease-out' }}>
            
            {/* 1. UPLOAD DE FOTO */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
              <label style={{ position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--input-bg)', border: '2px dashed var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={30} color="var(--text-dim)" />
                  )}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: '-5px', background: 'var(--accent)', padding: '6px', borderRadius: '50%', display: 'flex', border: '2px solid var(--bg-card)' }}>
                  <Camera size={14} color="white" />
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </label>
            </div>

            {/* 2. NOME DE UTILIZADOR */}
            <input
              className="input-field"
              type="text"
              placeholder="O teu Nome/Alcunha"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={isSignUp}
            />

            {/* 3. TOGGLE DE NOTIFICAÇÕES */}
            <div 
              onClick={() => setEnablePush(!enablePush)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--input-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', margin: '10px 0' }}
            >
              <div style={{ background: enablePush ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', padding: '8px', borderRadius: '8px' }}>
                <Bell size={18} color={enablePush ? "#16a34a" : "#ef4444"} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--text)' }}>Notificações</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>Sabe sempre que te desafiarem</p>
              </div>
              <div style={{ width: '40px', height: '24px', background: enablePush ? 'var(--accent)' : 'var(--border)', borderRadius: '30px', position: 'relative', transition: 'background 0.3s' }}>
                <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: enablePush ? '19px' : '3px', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </div>
            </div>

          </div>
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
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-dim)',
              cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button className="btn-primary" disabled={loading} style={{ marginTop: '20px' }}>
          {loading ? 'A processar...' : isSignUp ? 'Criar Conta' : 'Entrar na App'}
        </button>
      </form>

      <p style={{ fontSize: '14px', textAlign: 'center', marginTop: '25px', color: 'var(--text-dim)' }}>
        {isSignUp ? 'Já tens conta?' : 'Ainda não tens conta?'}{' '}
        <span
          style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}
          onClick={() => {
            setIsSignUp(!isSignUp);
            setToast({ show: false, message: '', type: '' }); // Limpa avisos
          }}
        >
          {isSignUp ? 'Fazer Login' : 'Registar aqui'}
        </span>
      </p>
    </div>
  );
}