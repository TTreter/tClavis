import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, RefreshCw, Tv, Printer, Info, AlertTriangle } from 'lucide-react';
import { IpBinding, RouterDevice } from '../../../shared/types';

interface Props {
  routers: RouterDevice[];
  onFetchBindings: () => Promise<IpBinding[]>;
  onSaveBinding: (binding: Omit<IpBinding, 'id'>) => Promise<void>;
  onDeleteBinding: (macAddress: string) => Promise<void>;
}

export const IpBindingView: React.FC<Props> = ({
  routers,
  onFetchBindings,
  onSaveBinding,
  onDeleteBinding,
}) => {
  const [bindings, setBindings] = useState<IpBinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [macAddress, setMacAddress] = useState('');
  const [comment, setComment] = useState('');
  const [bindingType, setBindingType] = useState<'bypassed' | 'regular' | 'blocked'>('bypassed');
  const [saving, setSaving] = useState(false);

  const loadBindings = async () => {
    setLoading(true);
    try {
      const data = await onFetchBindings();
      setBindings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBindings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!macAddress.trim()) return;

    setSaving(true);
    try {
      await onSaveBinding({
        routerId: 'cluster',
        macAddress: macAddress.trim(),
        type: bindingType,
        comment: comment.trim() || undefined,
        disabled: false,
      });
      setIsModalOpen(false);
      setMacAddress('');
      setComment('');
      await loadBindings();
    } catch (err: any) {
      alert('Erro ao salvar liberação: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mac: string) => {
    if (confirm(`Remover liberação do MAC ${mac} em todos os roteadores?`)) {
      await onDeleteBinding(mac);
      await loadBindings();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-accent-emerald" />
            <span>Dispositivos Liberados (MAC Binding)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Libere Smart TVs, impressoras de rede e totens sem exibir a tela de login do Hotspot
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadBindings}
            disabled={loading}
            className="p-2 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          <button
            onClick={() => routers.length > 0 && setIsModalOpen(true)}
            disabled={routers.length === 0}
            title={routers.length === 0 ? 'Cadastre ao menos 1 roteador primeiro' : 'Liberar dispositivo'}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Liberar Dispositivo</span>
          </button>
        </div>
      </div>

      {routers.length === 0 && (
        <div className="p-4 rounded-2xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-xs">
            <strong>Nenhum roteador conectado:</strong> Cadastre ao menos um MikroTik antes de liberar dispositivos por endereço MAC.
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center space-x-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-primary flex-shrink-0" />
        <span>
          O modo <strong>Bypassed</strong> permite que o dispositivo navegue na internet diretamente, sem precisar digitar usuário e senha no portal captive.
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-surface-border bg-surface/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">MAC Address</th>
              <th className="py-3 px-4">Identificação / Comentário</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Roteador</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-sm font-mono">
            {bindings.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 text-sm font-sans">
                  {loading ? 'Carregando dispositivos...' : 'Nenhum dispositivo liberado encontrado.'}
                </td>
              </tr>
            ) : (
              bindings.map((b, idx) => (
                <tr key={`${b.routerId}_${b.macAddress}_${idx}`} className="hover:bg-surface/30 transition">
                  <td className="py-3 px-4 font-bold text-white text-xs">{b.macAddress}</td>
                  <td className="py-3 px-4 text-xs font-sans text-slate-300">{b.comment || '---'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-semibold uppercase ${
                        b.type === 'bypassed'
                          ? 'bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30'
                          : b.type === 'blocked'
                          ? 'bg-accent-rose/15 text-accent-rose border border-accent-rose/30'
                          : 'bg-primary/15 text-primary border border-primary/30'
                      }`}
                    >
                      {b.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs font-sans text-slate-400">{b.routerName}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(b.macAddress)}
                      className="p-1.5 rounded-lg bg-surface hover:bg-accent-rose/20 text-slate-400 hover:text-accent-rose transition border border-surface-border"
                      title="Remover liberação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-accent-emerald" />
              <span>Liberar Dispositivo (Bypass)</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Endereço MAC *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: AA:BB:CC:DD:EE:FF"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Identificação / Comentário</label>
                <input
                  type="text"
                  placeholder="ex: Smart TV Recepção / Impressora HP"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ação de Acesso</label>
                <select
                  value={bindingType}
                  onChange={(e) => setBindingType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="bypassed">Bypassed (Navega sem tela de login)</option>
                  <option value="blocked">Blocked (Bloqueado / Sem internet)</option>
                  <option value="regular">Regular (Exige autenticação normal)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary"
                >
                  {saving ? 'Aplicando...' : 'Replicar no Cluster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
