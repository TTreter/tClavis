import React, { useState } from 'react';
import { Search, Plus, Trash2, RefreshCw, Eye, EyeOff, Shield, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { HotspotUser, LogicalGroup, RouterDevice } from '../../../shared/types';

interface Props {
  users: HotspotUser[];
  groups: LogicalGroup[];
  routers: RouterDevice[];
  onOpenCreate: () => void;
  onDeleteUser: (user: HotspotUser) => Promise<void>;
  onSyncUser: (user: HotspotUser) => Promise<void>;
  onSaveUser: (user: HotspotUser) => Promise<void>;
}

export const UsersView: React.FC<Props> = ({
  users,
  groups,
  routers,
  onOpenCreate,
  onDeleteUser,
  onSyncUser,
  onSaveUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.comment && u.comment.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGroup = selectedGroupFilter === 'ALL' || u.logicalGroupId === selectedGroupFilter;
    return matchesSearch && matchesGroup;
  });

  const handleSyncClick = async (user: HotspotUser) => {
    setSyncingId(user.id);
    try {
      await onSyncUser(user);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteClick = async (user: HotspotUser) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${user.username}" de todos os roteadores?`)) {
      await onDeleteUser(user);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuário ou comentário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
          >
            <option value="ALL">Todos os Grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenCreate}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-surface-border bg-surface/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Usuário</th>
              <th className="py-3 px-4">Senha</th>
              <th className="py-3 px-4">Grupo Lógico</th>
              <th className="py-3 px-4">Limites</th>
              <th className="py-3 px-4">Status de Sincronia nos MikroTiks</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-sm">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const group = groups.find((g) => g.id === user.logicalGroupId);
                const isRevealed = revealedPasswords[user.id];

                return (
                  <tr key={user.id} className="hover:bg-surface/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white font-mono">{user.username}</div>
                      {user.comment && <div className="text-xs text-slate-400">{user.comment}</div>}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2 font-mono text-xs">
                        <span className="text-slate-300">
                          {isRevealed ? user.password || '(sem senha)' : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(user.id)}
                          className="text-slate-500 hover:text-slate-300 transition"
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        <Shield className="w-3 h-3 mr-1" />
                        {group?.name || 'Padrão'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-300 font-mono">
                      <div>Tempo: {user.uptimeLimit || '∞'}</div>
                      {user.bytesLimit ? <div>Dados: {Math.round(user.bytesLimit / (1024 * 1024))} MB</div> : null}
                    </td>

                    {/* LIVE SYNC MATRIX PILLS */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {routers.map((router) => {
                          const status = user.syncStatus[router.id]?.status || 'pending';
                          return (
                            <span
                              key={router.id}
                              title={`${router.name}: ${status.toUpperCase()} (Profile: ${user.syncStatus[router.id]?.remoteProfile || 'default'})`}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                                status === 'synced'
                                  ? 'bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30'
                                  : status === 'pending'
                                  ? 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30'
                                  : 'bg-accent-rose/15 text-accent-rose border border-accent-rose/30'
                              }`}
                            >
                              {status === 'synced' ? '🟢' : status === 'pending' ? '🟡' : '🔴'}{' '}
                              <span className="ml-1">{router.name.split(' ')[0]}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          title="Sincronizar nos roteadores"
                          onClick={() => handleSyncClick(user)}
                          disabled={syncingId === user.id}
                          className="p-1.5 rounded-lg bg-surface hover:bg-surface-border text-slate-300 hover:text-white transition border border-surface-border"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingId === user.id ? 'animate-spin text-primary' : ''}`} />
                        </button>

                        <button
                          type="button"
                          title="Excluir usuário de todos os roteadores"
                          onClick={() => handleDeleteClick(user)}
                          className="p-1.5 rounded-lg bg-surface hover:bg-accent-rose/20 text-slate-400 hover:text-accent-rose transition border border-surface-border"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
