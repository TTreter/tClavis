import React, { useState, useEffect } from 'react';
import { X, Key, Shield, Clock, HardDrive, RefreshCw, Layers, AlertTriangle } from 'lucide-react';
import { HotspotUser, LogicalGroup, LogicalServer, RouterDevice } from '../../../shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: HotspotUser) => Promise<void>;
  groups: LogicalGroup[];
  servers: LogicalServer[];
  routers: RouterDevice[];
}

export const CreateUserModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  groups,
  servers,
  routers,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [selectedServerId, setSelectedServerId] = useState(servers[0]?.id || '');
  const [uptimeLimit, setUptimeLimit] = useState('1d');
  const [bytesLimitMb, setBytesLimitMb] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronização reativa dos selects quando dados do banco carregarem
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null); // Limpar erros anteriores
    if (groups.length > 0 && (!selectedGroupId || !groups.some((g) => g.id === selectedGroupId))) {
      setSelectedGroupId(groups[0].id);
    }
    if (servers.length > 0 && (!selectedServerId || !servers.some((s) => s.id === selectedServerId))) {
      setSelectedServerId(servers[0].id);
    }
  }, [isOpen, groups, servers]);

  if (!isOpen) return null;

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const selectedServer = servers.find((s) => s.id === selectedServerId);

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validação explícita eliminando retorno silencioso (silent abort)
    if (!username.trim()) {
      setErrorMessage('Por favor, informe o nome de usuário.');
      return;
    }
    if (!selectedGroupId) {
      setErrorMessage('Selecione um Grupo Lógico para mapear os perfis dos roteadores.');
      return;
    }

    setLoading(true);
    try {
      const initialSyncStatus: HotspotUser['syncStatus'] = {};
      for (const r of routers) {
        initialSyncStatus[r.id] = {
          status: 'pending',
          remoteProfile: selectedGroup?.routerMappings[r.id] || 'default',
          remoteServer: selectedServer?.routerMappings[r.id] || 'all',
        };
      }

      const newUser: HotspotUser = {
        id: `usr_${Date.now()}`,
        username: username.trim(),
        password: password.trim(),
        logicalGroupId: selectedGroupId,
        logicalServerId: selectedServerId || undefined,
        comment: comment.trim(),
        uptimeLimit: uptimeLimit.trim() || undefined,
        bytesLimit: bytesLimitMb ? parseInt(bytesLimitMb, 10) * 1024 * 1024 : undefined,
        disabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: initialSyncStatus,
      };

      await onSave(newUser);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar usuário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Novo Usuário Hotspot</h2>
              <p className="text-xs text-slate-400">Será sincronizado simultaneamente no cluster</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 0 Routers Guard */}
        {routers.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-accent-amber mx-auto" />
            <h3 className="font-bold text-white text-base">Nenhum MikroTik Cadastrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Para cadastrar usuários no Hotspot, é necessário ter pelo menos um roteador MikroTik configurado no cluster.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-surface hover:bg-surface-border text-white text-xs font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : groups.length === 0 ? (
          /* 0 Groups Guard */
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-accent-amber mx-auto" />
            <h3 className="font-bold text-white text-base">Nenhum Grupo Lógico Cadastrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Para cadastrar usuários e sincronizá-los com o MikroTik, configure ao menos um grupo no menu <strong>Mapeamento De-Para</strong>.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-surface hover:bg-surface-border text-white text-xs font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {errorMessage && (
              <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded-xl flex items-center space-x-2 text-accent-red text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome de Usuário / Login *</label>
              <input
                type="text"
                required
                placeholder="ex: visitante.silva"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Senha *</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-xs text-primary hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Gerar</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="Senha de acesso (opcional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
              {!password.trim() && (
                <p className="text-[11px] text-accent-amber mt-1 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>Sem senha: login direto sem autenticação por senha.</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Grupo Lógico (Perfil Global) *</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.rateLimit ? `(${g.rateLimit})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Servidor Hotspot Lógico</label>
              <select
                value={selectedServerId}
                onChange={(e) => setSelectedServerId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DYNAMIC CROSS-ROUTER PREVIEW CARD */}
          <div className="bg-surface-card/60 border border-surface-border/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-primary">
              <Layers className="w-4 h-4" />
              <span>Preview do Mapeamento De-Para (Perfis que serão aplicados):</span>
            </div>
            <div className="space-y-1.5 pl-1">
              {routers.map((router) => {
                const mappedProfile = selectedGroup?.routerMappings[router.id] || 'default';
                const mappedServer = selectedServer?.routerMappings[router.id] || 'all';
                return (
                  <div key={router.id} className="flex items-center justify-between text-xs text-slate-300 bg-background/50 px-2.5 py-1.5 rounded-lg border border-surface-border/50">
                    <span className="font-medium text-slate-200">{router.name}:</span>
                    <div className="flex items-center space-x-2">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[11px] font-mono">
                        Profile: {mappedProfile}
                      </span>
                      <span className="bg-accent-purple/10 text-accent-purple px-2 py-0.5 rounded text-[11px] font-mono">
                        Server: {mappedServer}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Limite de Tempo (Uptime)</label>
              <input
                type="text"
                placeholder="ex: 2h, 1d, 30m ou vazio para ilimitado"
                value={uptimeLimit}
                onChange={(e) => setUptimeLimit(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Franquia de Dados (MB)</label>
              <input
                type="number"
                placeholder="ex: 1024 para 1GB"
                value={bytesLimitMb}
                onChange={(e) => setBytesLimitMb(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Comentário / Identificação</label>
            <input
              type="text"
              placeholder="ex: Quarto 102 / Dr. Carlos / Evento Tech"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Buttons */}
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
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center space-x-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Criar & Sincronizar</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
