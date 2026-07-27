import { useState, useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { BellRing, AlertTriangle } from 'lucide-react';

export default function PermissaoNotificacoes() {
  const [permission, setPermission] = useState('granted'); // Assume granted por defeito para não piscar
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Verifica se a pessoa já instalou a app (não queremos chatear quem está no Safari/Chrome normal, porque no iPhone as notificações nem funcionam lá)
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || window.navigator.standalone === true;
    setIsStandalone(checkStandalone);

    // 2. Verifica o estado atual das notificações do telemóvel
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    // 3. Cria um "espião" para atualizar o ecrã mal a pessoa clique em "Permitir" no pop-up do telemóvel
    const interval = setInterval(() => {
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Se a pessoa já permitiu, ou se já negou permanentemente, ou se não está na app instalada, não mostramos nada.
  // Só queremos chatear quem está no estado 'default' (ainda não respondeu).
  if (!isStandalone || permission !== 'default') return null;

  const pedirPermissao = () => {
    // Chama o OneSignal para disparar o pop-up nativo do telemóvel
    OneSignal.Slidedown.promptPush();
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
        
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '15px', marginBottom: '25px', display: 'flex', gap: '10px', alignItems: 'center', textAlign: 'left' }}>
          <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '12px', color: '#991b1b' }}>
            No próximo ecrã, clica obrigatoriamente em <b>"Permitir"</b>, senão ficas de fora da brincadeira.
          </p>
        </div>

        <button 
          onClick={pedirPermissao}
          style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: '900', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)' }}
        >
          Ativar Notificações
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