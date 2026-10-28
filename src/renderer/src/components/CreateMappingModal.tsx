import React, { useState, useEffect } from 'react';
import { X, GitFork, RefreshCw, Plus, Check, AlertTriangle, Sparkles } from 'lucide-react';
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
  const [fetchingProfiles, setFetchingProfiles] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState<Record<string, string[]>>({});

  // Inline new profile creation state per router
  const [creatingProfileRouterId, setCreatingProfileRouterId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileRateLimit, setNewProfileRateLimit] = useState('');
  const [creatingProfileLoading, setCreatingProfileLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Auto-fetch profiles from all routers on open
  useEffect(() => {
    if (isOpen && routers.length > 0) {
      loadAllProfiles();
    }
  }, [isOpen]);

  const loadAllProfiles = async () => {
    setFetchingProfiles(true);
    const profileMap: Record<string, string[]> = {};
    const defaultMappings: Record<string, string> = { ...mappings };

    for (const router of routers) {
      try {
        if (onInspectRouter) {
          const res = await onInspectRouter(router);
          profileMap[router.id] = res.profiles;
          if (!defaultMappings[router.id]) {
            defaultMappings[router.id] = res.profiles[0] || 'default';
          }
        } else if (router.cachedProfiles && router.cachedProfiles.length > 0) {
          profileMap[router.id] = router.cachedProfiles;
          if (!defaultMappings[router.id]) {
            defaultMappings[router.id] = router.cachedProfiles[0];
          }
        } else {
          profileMap[router.id] = ['default'];
          if (!defaultMappings[router.id]) {
            defaultMappings[router.id] = 'default';
          }
        }
      } catch (err) {
        // Fallback to cache if inspection fails
        if (router.cachedProfiles && router.cachedProfiles.length > 0) {
          profileMap[router.id] = router.cachedProfiles;
        } else {
          profileMap[router.id] = ['default'];
        }
        if (!defaultMappings[router.id]) {
          defaultMappings[router.id] = 'default';
        }
      }
    }

    setAvailableProfiles(profileMap);
    setMappings(defaultMappings);
    setFetchingProfiles(false);
  };

  const handleSelectChange = (routerId: string, val: string) => {
    if (val === '__CREATE_NEW__') {
      setCreatingProfileRouterId(routerId);
      setNewProfileName('');
      setNewProfileRateLimit(rateLimit || '');
      setInlineError(null);
    } else {
      setMappings((prev) => ({ ...prev, [routerId]: val }));
      if (creatingProfileRouterId === routerId) {
        setCreatingProfileRouterId(null);
      }
    }
  };

  const handleCreateRemoteProfile = async (router: RouterDevice) => {
    if (!newProfileName.trim() || !window.tclavisAPI?.createRouterProfile) return;
    setCreatingProfileLoading(true);
    setInlineError(null);
    try {
      const res = await window.tclavisAPI.createRouterProfile(
        router.id,
        newProfileName.trim(),
        newProfileRateLimit.trim() || undefined
      );

      if (!res.success) {
        setInlineError(res.error || 'Erro ao criar perfil no MikroTik.');
        return;
      }

      const createdName = res.profileName || newProfileName.trim();

      // Add to available profiles for this router
      setAvailableProfiles((prev) => ({
        ...prev,
        [router.id]: Array.from(new Set([...(prev[router.id] || []), createdName])),
      }));

      // Select it immediately
      setMappings((prev) => ({ ...prev, [router.id]: createdName }));
      setCreatingProfileRouterId(null);
      setNewProfileName('');
    } catch (err: any) {
      setInlineError(err.message || 'Falha na comunicação com o MikroTik.');
    } finally {
      setCreatingProfileLoading(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Limite de Banda Global (Opcional)</label>
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
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Mapeamento de Perfis por Roteador (De-Para):
              </label>
              {fetchingProfiles && (
                <span className="text-[11px] text-primary flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Consultando caixas...</span>
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {routers.map((router) => {
                const profiles = availableProfiles[router.id] || router.cachedProfiles || ['default'];
                const isCreatingInline = creatingProfileRouterId === router.id;
                const isOffline = router.status === 'offline';

                return (
                  <div
                    key={router.id}
                    className="p-3 bg-surface-card rounded-xl border border-surface-border text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white">{router.name}</span>
                          {isOffline && (
                            <span className="text-[10px] text-accent-amber bg-accent-amber/10 border border-accent-amber/20 px-1.5 py-0.2 rounded font-mono">
                              Offline (Cache)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {router.host}:{router.port}
                        </div>
                      </div>

                      <div className="w-64">
                        <select
                          value={isCreatingInline ? '__CREATE_NEW__' : mappings[router.id] || profiles[0] || 'default'}
                          onChange={(e) => handleSelectChange(router.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-background border border-surface-border rounded-lg text-white text-xs focus:outline-none focus:border-primary font-mono"
                        >
                          {profiles.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                          <option disabled>──────────────</option>
                          <option value="__CREATE_NEW__">✨ + Criar novo perfil na caixa...</option>
                        </select>
                      </div>
                    </div>

                    {/* Inline Profile Creation Form */}
                    {isCreatingInline && (
                      <div className="mt-2 p-2.5 rounded-lg bg-background border border-primary/30 space-y-2 animate-fadeIn">
                        <div className="flex items-center space-x-1.5 text-primary text-[11px] font-semibold">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Criar novo User Profile diretamente no {router.name}:</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Nome (ex: Perfil_10M)"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            className="px-2 py-1 bg-surface-card border border-surface-border rounded text-white text-xs focus:outline-none focus:border-primary font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Rate Limit (ex: 10M/10M)"
                            value={newProfileRateLimit}
                            onChange={(e) => setNewProfileRateLimit(e.target.value)}
                            className="px-2 py-1 bg-surface-card border border-surface-border rounded text-white text-xs focus:outline-none focus:border-primary font-mono"
                          />
                        </div>

                        {inlineError && (
                          <div className="text-accent-rose text-[11px] flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            <span>{inlineError}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setCreatingProfileRouterId(null)}
                            className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateRemoteProfile(router)}
                            disabled={creatingProfileLoading || !newProfileName.trim()}
                            className="px-3 py-1 bg-primary hover:bg-primary-hover text-background font-semibold rounded text-[11px] flex items-center space-x-1 transition disabled:opacity-50"
                          >
                            {creatingProfileLoading ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>Criar na Caixa</span>
                          </button>
                        </div>
                      </div>
                    )}
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
