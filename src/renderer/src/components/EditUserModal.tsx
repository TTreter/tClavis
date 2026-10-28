import React, { useState, useEffect } from 'react';
import { X, Key, Shield, RefreshCw, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { HotspotUser, LogicalGroup, LogicalServer, RouterDevice } from '../../../shared/types';

interface Props {
  isOpen: boolean;
  user: HotspotUser | null;
  onClose: () => void;
  onSave: (user: HotspotUser) => Promise<void>;
  groups: LogicalGroup[];
  servers: LogicalServer[];
  routers: RouterDevice[];
}

export const EditUserModal: React.FC<Props> = ({
  isOpen,
  user,
  onClose,
  onSave,
  groups,
  servers,
  routers,
}) => {
  const [password, setPassword] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedServerId, setSelectedServerId] = useState('');
  const [uptimeLimit, setUptimeLimit] = useState('');
  const [bytesLimitMb, setBytesLimitMb] = useState('');
  const [comment, setComment] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setPassword(user.password || '');
      setSelectedGroupId(user.logicalGroupId || groups[0]?.id || '');
      setSelectedServerId(user.logicalServerId || servers[0]?.id || '');
      setUptimeLimit(user.uptimeLimit || '');
      setBytesLimitMb(user.bytesLimit ? Math.round(user.bytesLimit / (1024 * 1024)).toString() : '');
      setComment(user.comment || '');
      setDisabled(user.disabled || false);
    }
  }, [user, groups, servers]);

  if (!isOpen || !user) return null;

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
    if (!selectedGroupId) return;

    setLoading(true);
    try {
      // Prepare updated syncStatus for all routers
      const updatedSyncStatus: HotspotUser['syncStatus'] = { ...user.syncStatus };
      for (const r of routers) {
        updatedSyncStatus[r.id] = {
          status: 'pending',
          remoteProfile: selectedGroup?.routerMappings[r.id] || 'default',
          remoteServer: selectedServer?.routerMappings[r.id] || 'all',
        };
      }

      const updatedUser: HotspotUser = {
        ...user,
        password: password.trim(),
        logicalGroupId: selectedGroupId,
        logicalServerId: selectedServerId || undefined,
        comment: comment.trim(),
        uptimeLimit: uptimeLimit.trim() || undefined,
        bytesLimit: bytesLimitMb ? parseInt(bytesLimitMb, 10) * 1024 * 1024 : undefined,
        disabled,
        updatedAt: new Date().toISOString(),
        syncStatus: updatedSyncStatus,
      };

      await onSave(updatedUser);
      onClose();
    } catch (err: any) {
      alert('Erro ao atualizar usuário: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Editar Usuário:</span>
                <span className="font-mono text-primary">{user.username}</span>
              </h2>
              <p className="text-xs text-slate-400">Alterações serão sincronizadas em todo o cluster</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Nova Senha</label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-xs text-primary hover:underline flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Gerar Senha</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Group and Server selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Grupo Lógico (Perfil)</label>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Servidor Hotspot</label>
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

          {/* Live Preview Card */}
          <div className="bg-surface-card/60 border border-surface-border/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-primary">
              <Layers className="w-4 h-4" />
              <span>Perfis que serão aplicados com essa alteração:</span>
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

          {/* Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Limite de Tempo (Uptime)</label>
              <input
                type="text"
                placeholder="ex: 2h, 1d ou vazio para ilimitado"
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

          {/* Comment */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Comentário</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Toggle Disabled */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="userDisabled"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
              className="rounded bg-surface-card border-surface-border text-primary focus:ring-0"
            />
            <label htmlFor="userDisabled" className="text-xs text-slate-300 cursor-pointer">
              Bloquear / Suspender usuário temporariamente (<span className="font-mono text-accent-rose">disabled=yes</span>)
            </label>
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
              <span>Salvar & Replicar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
