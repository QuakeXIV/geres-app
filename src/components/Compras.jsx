import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShoppingCart, Plus, CheckCircle2, Circle, Trash2, Beef } from 'lucide-react';

export default function Compras({ session }) {
  const [items, setItems] = useState([]);
  const [novoItem, setNovoItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  }

  useEffect(() => {
    carregarLista();
  }, []);

  async function carregarLista() {
    const { data: listData, error } = await supabase
      .from('shopping_list')
      .select('*, profiles(username)')
      .order('is_bought', { ascending: true }) // Os não comprados ficam em cima
      .order('created_at', { ascending: false });

    if (!error) {
      const itemsComPerfis = (listData || []).map(item => ({
        ...item,
        profiles: item.profiles || { username: 'Anónimo' }
      }));
      setItems(itemsComPerfis);
    }
  }

  async function adicionarItem(e) {
    e.preventDefault();
    if (!novoItem.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('shopping_list').insert([{
      user_id: session.user.id,
      item_name: novoItem
    }]);

    if (error) {
      showToast(`Erro: ${error.message}`, 'error');
    } else {
      setNovoItem('');
      await carregarLista();
    }
    setLoading(false);
  }

  async function toggleComprado(id, currentStatus) {
    const { error } = await supabase
      .from('shopping_list')
      .update({ is_bought: !currentStatus })
      .eq('id', id);

    if (!error) {
      await carregarLista();
    } else {
      showToast('Erro ao atualizar o item', 'error');
    }
  }

  async function apagarItem(id) {
    const { error } = await supabase.from('shopping_list').delete().eq('id', id);
    if (!error) {
      await carregarLista();
    }
  }

  const comprados = items.filter(i => i.is_bought).length;
  const total = items.length;
  const progresso = total === 0 ? 0 : Math.round((comprados / total) * 100);

  return (
    <div style={{ padding: '10px', paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}>
      
      {toast.show && (
        <div className={`custom-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'fixed', top: 'calc(60px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '90%', maxWidth: '400px' }}>
          {toast.message}
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
        <h2 style={{ margin: '0 0 5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <Beef size={26} /> Radar da Fome
        </h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Lista colaborativa. Se não estiver aqui, não se compra.</p>
        
        {total > 0 && (
          <div style={{ marginTop: '15px', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
              <span>Progresso no Continente</span>
              <span>{progresso}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progresso}%`, height: '100%', background: 'white', transition: 'width 0.3s' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* ADICIONAR ITEM */}
      <div className="card">
        <form onSubmit={adicionarItem} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Ex: 5 sacos de Gelo..." 
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px' }}
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={24} />
          </button>
        </form>
      </div>

      {/* LISTA DE ITENS */}
      <div className="card">
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <ShoppingCart size={20} color="#10b981" /> O que falta comprar
        </h3>
        
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px', margin: '20px 0' }}>
            A despensa está cheia (ou esqueceram-se de apontar tudo).
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map((item) => (
              <div key={item.id} style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '12px', background: item.is_bought ? '#f8fafc' : 'white', 
                border: item.is_bought ? '1px solid #e2e8f0' : '2px solid #10b981', 
                borderRadius: '12px', transition: 'all 0.2s' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer' }} onClick={() => toggleComprado(item.id, item.is_bought)}>
                  {item.is_bought ? (
                    <CheckCircle2 size={24} color="#94a3b8" />
                  ) : (
                    <Circle size={24} color="#10b981" />
                  )}
                  <div>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: item.is_bought ? 'normal' : 'bold', color: item.is_bought ? '#94a3b8' : 'var(--text)', textDecoration: item.is_bought ? 'line-through' : 'none' }}>
                      {item.item_name}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-dim)' }}>
                      Pedido por @{item.profiles?.username}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); apagarItem(item.id); }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex' }}
                >
                  <Trash2 size={18} color="#ef4444" opacity={item.is_bought ? 0.5 : 1} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}