import { useState, useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { BellRing, AlertTriangle } from 'lucide-react';

export default function PermissaoNotificacoes() {
  const [permission, setPermission] = useState('granted'); // Assume 'granted' para não piscar logo
  const [isStandalone, setIsStandalone] = useState(false);
  const [forceHide, setForceHide] = useState(false); // Botão de emergência

  useEffect(() => {
    // 1. Verifica se está no ecrã principal
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || window.navigator.standalone === true;
    setIsStandalone(checkStandalone);

    // 2. Se o telemóvel for antigo e não suportar notificações de todo, escondemos logo
    if (!("Notification" in window)) {
      setPermission('denied');
      return;
    }

    // 3. Vê o estado atual
    setPermission(Notification.permission);

    // 4. Espião para quando ele aceitar o ecrã sumir
    const interval = setInterval(() => {
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Se já deu permissão, ou se negou, ou se ativou o botão de emergência, desaparece
  if (!isStandalone || permission !== 'default' || forceHide) return null;

  const pedirPermissao = async () => {
    try {
      // 1. Manda o comando NATIVO para o telemóvel (Isto obriga o pop-up do iPhone/Android a aparecer na hora)
      if ("Notification" in window) {
        const perm = await window.Notification.requestPermission();
        setPermission(perm);
      }
      
      // 2. Avisa o OneSignal para registar o telemóvel (Nova API v16)
      if (OneSignal.Notifications) {
        await OneSignal.Notifications.requestPermission();
      } else if (OneSignal.Slidedown) {
        OneSignal.Slidedown.promptPush();
      }
    } catch (error) {
      console.error("Erro ao pedir permissão:", error);
      // Se a Apple bloquear ou der erro, esconde o modal para a pessoa poder usar a app
      setForceHide(true); 
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '350px', textAlign: 'center', margin: 0, padding: '30px 20px', animation: 'scaleIn 0.3s ease-out' }}>
        
        <div style={{ background: '#ffedd5', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', animation: 'pulse 2s infinite' }}>
          <BellRing size={34} color="var(--accent)" />
        </div>
        
        <h2 style={{ margin: '0 0 10px 0', color: 'var(--text)', fontSize: '22px' }}>Falta um detalhe...</h2>
        
        <p style={{ color: 'var(--text-dim)', fontSize: '15px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
          O Tribunal precisa de te avisar quando tens de beber um shot ou quando há um jogo novo na Arena. 
        </p>
        
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '15px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', textAlign: 'left' }}>
          <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '12px', color: '#991b1b' }}>
            No próximo ecrã, clica obrigatoriamente em <b>"Permitir"</b>, senão ficas de fora da brincadeira.
          </p>
        </div>

        <button 
          onClick={pedirPermissao}
          style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: '900', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)', marginBottom: '15px' }}
        >
          Ativar Notificações
        </button>

        {/* Botão de Emergência / Skip */}
        <button 
          onClick={() => setForceHide(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Pular por agora (Risco próprio)
        </button>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}