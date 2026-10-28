import React, { useState, useEffect } from 'react';
import { X, DownloadCloud, RefreshCw, CheckSquare, Square, Shield, CheckCircle2, AlertCircle, HardDrive, Clock, ArrowRight } from 'lucide-react';
import { RouterDevice, DiscoveredRouterUser, ImportUsersBatchOptions } from '../../../shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  routers: RouterDevice[];
  onImportBatch: (options: ImportUsersBatchOptions) => Promise<{ importedCount: number; groupsCreated: number }>;
  initialRouterId?: string;
}

export const ImportUsersModal: React.FC<Props> = ({
  isOpen,
  onClose,
  routers,
  onImportBatch,
  initialRouterId,
}) => {
  const [selectedRouterId, setSelectedRouterId] = useState<string>(initialRouterId || routers[0]?.id || '');
  const [discoveredUsers, setDiscoveredUsers] = useState<DiscoveredRouterUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Import options
  const [autoCreateGroups, setAutoCreateGroups] = useState(true);
  const [syncToOtherRouters, setSyncToOtherRouters] = useState(true);

  // Sync selectedRouterId when modal opens or initialRouterId changes
  useEffect(() => {
    if (isOpen) {
      const activeId = initialRouterId || routers[0]?.id || '';
      setSelectedRouterId(activeId);
      if (activeId) {
        fetchUsersFromRouter(activeId);
      }
    }
  }, [isOpen, initialRouterId]);

  if (!isOpen) return null;

  const fetchUsersFromRouter = async (routerId: string) => {
    if (!routerId || !window.tclavisAPI?.discoverUsersFromRouter) return;
    setLoading(true);
    setError(null);
    try {
      const users: DiscoveredRouterUser[] = await window.tclavisAPI.discoverUsersFromRouter(routerId);
      setDiscoveredUsers(users);

      // By default, select all NEW users
      const initialSelection: Record<string, boolean> = {};
      users.forEach((u) => {
        if (!u.alreadyExists) {
          initialSelection[u.name] = true;
        }
      });
      setSelectedUsers(initialSelection);
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar usuários no MikroTik.');
      setDiscoveredUsers([]);
      setSelectedUsers({});
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    const newUsers = discoveredUsers.filter((u) => !u.alreadyExists);
    const allSelected = newUsers.length > 0 && newUsers.every((u) => selectedUsers[u.name]);

    const updated: Record<string, boolean> = {};
    if (!allSelected) {
      newUsers.forEach((u) => {
        updated[u.name] = true;
      });
    }
    setSelectedUsers(updated);
  };

  const handleToggleUser = (username: string) => {
    setSelectedUsers((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  const selectedCount = Object.values(selectedUsers).filter(Boolean).length;
  const newUsersCount = discoveredUsers.filter((u) => !u.alreadyExists).length;

  const handleExecuteImport = async () => {
    const usersToImport = discoveredUsers.filter((u) => selectedUsers[u.name]);
    if (usersToImport.length === 0) return;

    setImporting(true);
    try {
      await onImportBatch({
        sourceRouterId: selectedRouterId,
        users: usersToImport,
        autoCreateGroups,
        syncToOtherRouters,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao importar usuários para o tClavis.');
    } finally {
      setImporting(false);
    }
  };

  const currentRouter = routers.find((r) => r.id === selectedRouterId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Importar Usuários do MikroTik</h2>
              <p className="text-xs text-slate-400">
                Recupere e sincronize usuários já cadastrados na memória da caixa física
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar: Select Router & Refresh */}
        <div className="p-4 border-b border-surface-border bg-surface/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              MikroTik de Origem:
            </label>
            <select
              value={selectedRouterId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedRouterId(id);
                fetchUsersFromRouter(id);
              }}
              className="px-3 py-1.5 bg-surface-card border border-surface-border rounded-xl text-white text-xs focus:outline-none focus:border-primary font-medium"
            >
              {routers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.host}:{r.port})
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchUsersFromRouter(selectedRouterId)}
              disabled={loading}
              title="Reconsultar roteador"
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-border border border-surface-border text-slate-300 hover:text-white transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <span className="text-slate-400">
              Total na Caixa: <strong className="text-white">{discoveredUsers.length}</strong>
            </span>
            <span className="text-accent-emerald">
              Novos: <strong className="font-bold">{newUsersCount}</strong>
            </span>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-primary hover:underline font-semibold flex items-center space-x-1"
            >
              <span>{selectedCount === newUsersCount && newUsersCount > 0 ? 'Desmarcar Todos' : 'Selecionar Novos'}</span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="m-4 p-3 bg-accent-rose/10 border border-accent-rose/30 rounded-xl text-accent-rose text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm text-slate-300">
                Lendo base de dados física de {currentRouter?.name || 'MikroTik'}...
              </p>
            </div>
          ) : discoveredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm space-y-2">
              <DownloadCloud className="w-10 h-10 mx-auto text-slate-600" />
              <p>Nenhum usuário encontrado neste roteador MikroTik.</p>
            </div>
          ) : (
            <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-surface/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">Sel.</th>
                    <th className="py-2.5 px-3">Usuário</th>
                    <th className="py-2.5 px-3">Senha</th>
                    <th className="py-2.5 px-3">Profile no MK</th>
                    <th className="py-2.5 px-3">Server</th>
                    <th className="py-2.5 px-3">Limites</th>
                    <th className="py-2.5 px-3">Comentário</th>
                    <th className="py-2.5 px-3 text-right">Status no tClavis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border font-mono">
                  {discoveredUsers.map((u) => {
                    const isSelected = !!selectedUsers[u.name];
                    return (
                      <tr
                        key={u.name}
                        onClick={() => !u.alreadyExists && handleToggleUser(u.name)}
                        className={`transition cursor-pointer ${
                          u.alreadyExists
                            ? 'opacity-50 bg-background/30 cursor-not-allowed'
                            : isSelected
                            ? 'bg-primary/5 hover:bg-primary/10'
                            : 'hover:bg-surface/40'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          {u.alreadyExists ? (
                            <CheckCircle2 className="w-4 h-4 text-slate-500 mx-auto" />
                          ) : isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary mx-auto" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500 mx-auto" />
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{u.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {u.password ? '••••••••' : '(sem senha)'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="bg-accent-purple/15 text-accent-purple border border-accent-purple/30 px-2 py-0.5 rounded text-[10px] font-bold">
                            {u.profile}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{u.server || 'all'}</td>
                        <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                          {u.uptimeLimit ? `Tempo: ${u.uptimeLimit}` : 'Sem limite'}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400 truncate max-w-xs">
                          {u.comment || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          {u.alreadyExists ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-700/40 text-slate-400 border border-slate-600/40">
                              Já Cadastrado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 font-semibold">
                              🟢 Novo para Importar
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Options & Actions */}
        <div className="p-4 border-t border-surface-border bg-surface-card flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-1.5 text-xs text-slate-300">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCreateGroups}
                onChange={(e) => setAutoCreateGroups(e.target.checked)}
                className="rounded border-surface-border text-primary focus:ring-0"
              />
              <span>Criar Grupos Globais automaticamente para perfis novos não mapeados</span>
            </label>

            {routers.length > 1 && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToOtherRouters}
                  onChange={(e) => setSyncToOtherRouters(e.target.checked)}
                  className="rounded border-surface-border text-primary focus:ring-0"
                />
                <span>Propagar/sincronizar imediatamente para os demais roteadores do cluster</span>
              </label>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-surface transition text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing || selectedCount === 0}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition shadow-glow-primary flex items-center space-x-2 disabled:opacity-50"
            >
              {importing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <DownloadCloud className="w-4 h-4" />
              )}
              <span>Importar {selectedCount} Usuário(s)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
