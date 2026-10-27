import React, { useState } from 'react';
import { X, GitFork, RefreshCw } from 'lucide-react';
import { LogicalGroup, RouterDevice } from '../../../shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: LogicalGroup) => Promise<void>;
  routers: RouterDevice[];
  onInspectRouter?: (router: RouterDevice) => Promise<{ profiles: string[]; servers: string[] }>;
}

export const CreateMappingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  routers,
  onInspectRouter,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rateLimit, setRateLimit] = useState('');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState<Record<string, string[]>>({});

  if (!isOpen) return null;

  const handleFetchProfiles = async (router: RouterDevice) => {
    if (!onInspectRouter) return;
    try {
      const res = await onInspectRouter(router);
      setAvailableProfiles((prev) => ({
        ...prev,
        [router.id]: res.profiles,
      }));
    } catch (err: any) {
      alert(`Não foi possível ler perfis de ${router.name}: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const group: LogicalGroup = {
        id: `grp_${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        rateLimit: rateLimit.trim() || undefined,
        routerMappings: mappings,
      };

      await onSave(group);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Criar Mapeamento De-Para</h2>
              <p className="text-xs text-slate-400">Referencie um Grupo Global aos perfis de cada MikroTik</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Grupo Global *</label>
              <input
                type="text"
                required
                placeholder="ex: Visitantes 10M ou VIP"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Limite de Banda (Opcional)</label>
              <input
                type="text"
                placeholder="ex: 10M/10M"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
            <input
              type="text"
              placeholder="ex: Acesso de cortesia para hóspedes e clientes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Router Mappings List */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-slate-300">
              Mapeamento de Perfis por Roteador (De-Para):
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {routers.map((router) => {
                const profiles = availableProfiles[router.id];
                return (
                  <div
                    key={router.id}
                    className="flex items-center justify-between p-2.5 bg-surface-card rounded-xl border border-surface-border text-xs"
                  >
                    <div className="flex-1 mr-3">
                      <div className="font-semibold text-white">{router.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{router.host}:{router.port}</div>
                    </div>

                    <div className="flex items-center space-x-2 w-64">
                      {profiles ? (
                        <select
                          value={mappings[router.id] || 'default'}
                          onChange={(e) =>
                            setMappings({ ...mappings, [router.id]: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-background border border-surface-border rounded-lg text-white text-xs focus:outline-none focus:border-primary font-mono"
                        >
                          {profiles.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nome do Profile no MK (ex: Perfil_10M)"
                          value={mappings[router.id] || ''}
                          onChange={(e) =>
                            setMappings({ ...mappings, [router.id]: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-background border border-surface-border rounded-lg text-white text-xs focus:outline-none focus:border-primary font-mono"
                        />
                      )}

                      {onInspectRouter && (
                        <button
                          type="button"
                          title="Ler perfis salvos neste MikroTik"
                          onClick={() => handleFetchProfiles(router)}
                          className="p-1.5 rounded-lg bg-surface hover:bg-surface-border border border-surface-border text-slate-300 hover:text-white transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-surface-card transition text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary"
            >
              Salvar Mapeamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
