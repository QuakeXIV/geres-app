import { useState, useEffect } from 'react';
import { Share, PlusSquare, MoreVertical, Smartphone, X, MonitorDown } from 'lucide-react';

export default function TutorialInstalacao() {
  const [device, setDevice] = useState(null); // 'ios', 'android', ou 'desktop'
  const [isInstalled, setIsInstalled] = useState(true); // Começa como true para não piscar
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 1. Verificar se a app já está instalada (Standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                      || window.navigator.standalone === true 
                      || document.referrer.includes('android-app://');
    
    setIsInstalled(isStandalone);

    if (!isStandalone) {
      // 2. Se não está instalada, detetar o dispositivo
      const userAgent = window.navigator.userAgent.toLowerCase();
      
      if (/iphone|ipad|ipod/.test(userAgent)) {
        setDevice('ios');
      } else if (/android/.test(userAgent)) {
        setDevice('android');
      } else {
        setDevice('desktop'); // Pc normal
      }
      
      // Mostrar o tutorial com um pequeno atraso de 1 segundo para não ser agressivo
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Se já está instalada ou se fechou o tutorial, não mostra nada
  if (isInstalled || !show) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 999999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      
      {/* Botão para fechar (caso a pessoa seja casmurra e não queira instalar) */}
      <button onClick={() => setShow(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '10px', color: 'white', cursor: 'pointer' }}>
        <X size={24} />
      </button>

      {/* Cartão que desliza de baixo para cima */}
      <div style={{ background: 'var(--bg-card)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '30px 20px', animation: 'slideUp 0.4s ease-out', borderTop: '1px solid var(--border)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
            <Smartphone size={32} color="var(--accent)" />
          </div>
          <h2 style={{ margin: '0 0 10px 0', color: 'var(--text)', fontSize: '22px' }}>Instala a App do Gerês!</h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.5' }}>
            Para receberes notificações dos jogos e aprovações do tribunal, precisas de ter a app no teu ecrã principal.
          </p>
        </div>

        {/* INSTRUÇÕES PARA IPHONE */}
        {device === 'ios' && (
          <div style={{ background: 'var(--input-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Como instalar no iPhone:</h4>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <Share size={24} color="#007AFF" />
              </div>
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--text)' }}>
                1. Toca no ícone de <b>Partilhar</b> na barra inferior do Safari.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <PlusSquare size={24} color="var(--text)" />
              </div>
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--text)' }}>
                2. Rola para baixo e escolhe <b>"Ecrã Principal"</b> (Add to Home Screen).
              </p>
            </div>
          </div>
        )}

        {/* INSTRUÇÕES PARA ANDROID */}
        {device === 'android' && (
          <div style={{ background: 'var(--input-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Como instalar no Android:</h4>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <MoreVertical size={24} color="var(--text)" />
              </div>
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--text)' }}>
                1. Toca nos <b>3 pontos</b> no canto superior direito do Chrome.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <MonitorDown size={24} color="var(--text)" />
              </div>
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--text)' }}>
                2. Seleciona <b>"Adicionar ao ecrã principal"</b> ou "Instalar aplicação".
              </p>
            </div>
          </div>
        )}

        {/* INSTRUÇÕES PARA PC */}
        {device === 'desktop' && (
          <div style={{ textAlign: 'center', padding: '15px', background: 'var(--input-bg)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontSize: '15px', color: 'var(--text)' }}>
              Clica no ícone de instalação <MonitorDown size={18} style={{ verticalAlign: 'middle' }}/> na barra de endereço do teu browser no canto superior direito.
            </p>
          </div>
        )}

        {device === 'ios' && (
          <div style={{ textAlign: 'center', marginTop: '20px', animation: 'bounce 2s infinite' }}>
            <div style={{ width: '4px', height: '30px', background: 'var(--text-dim)', margin: '0 auto', borderRadius: '4px' }}></div>
            <div style={{ width: '0', height: '0', borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '10px solid var(--text-dim)', margin: '0 auto' }}></div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(10px); }
        }
      `}</style>
    </div>
  );
}