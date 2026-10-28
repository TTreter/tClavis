import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Edit3,
  DownloadCloud,
  AlertTriangle,
  Network,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Layers,
  X,
} from 'lucide-react';
import { HotspotUser, LogicalGroup, RouterDevice } from '../../../shared/types';

interface Props {
  users: HotspotUser[];
  groups: LogicalGroup[];
  routers: RouterDevice[];
  onOpenCreate: () => void;
  onOpenEdit: (user: HotspotUser) => void;
  onOpenImport: () => void;
  onDeleteUser: (user: HotspotUser) => Promise<void>;
  onSyncUser: (user: HotspotUser) => Promise<void>;
  onSaveUser: (user: HotspotUser) => Promise<void>;
  onNavigateToRouters?: () => void;
  onBatchDeleteUsers?: (users: HotspotUser[]) => Promise<void>;
  onBatchSyncUsers?: (users: HotspotUser[]) => Promise<void>;
  onBatchUpdateGroup?: (users: HotspotUser[], groupId: string) => Promise<void>;
  onBatchToggleDisabled?: (users: HotspotUser[], disabled: boolean) => Promise<void>;
  requireAuth?: (action: () => void) => void;
  isUnlocked?: boolean;
}

export const UsersView: React.FC<Props> = ({
  users,
  groups,
  routers,
  onOpenCreate,
  onOpenEdit,
  onOpenImport,
  onDeleteUser,
  onSyncUser,
  onSaveUser,
  onNavigateToRouters,
  onBatchDeleteUsers,
  onBatchSyncUsers,
  onBatchUpdateGroup,
  onBatchToggleDisabled,
  requireAuth,
  isUnlocked,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SYNCED' | 'PENDING' | 'ERROR' | 'DISABLED'>('ALL');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Selection & Batch State
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [batchChangeGroupOpen, setBatchChangeGroupOpen] = useState(false);
  const [targetBatchGroupId, setTargetBatchGroupId] = useState(groups[0]?.id || '');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Reset revealed passwords when session locks
  useEffect(() => {
    if (!isUnlocked) {
      setRevealedPasswords({});
    }
  }, [isUnlocked]);

  const togglePasswordVisibility = (userId: string) => {
    const isCurrentlyRevealed = !!revealedPasswords[userId];
    if (isCurrentlyRevealed) {
      setRevealedPasswords((prev) => ({ ...prev, [userId]: false }));
    } else {
      if (requireAuth) {
        requireAuth(() => {
          setRevealedPasswords((prev) => ({ ...prev, [userId]: true }));
        });
      } else {
        setRevealedPasswords((prev) => ({ ...prev, [userId]: true }));
      }
    }
  };

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.comment && u.comment.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesGroup = selectedGroupFilter === 'ALL' || u.logicalGroupId === selectedGroupFilter;

      let matchesStatus = true;
      if (statusFilter === 'DISABLED') {
        matchesStatus = u.disabled;
      } else if (statusFilter === 'SYNCED') {
        const statuses = Object.values(u.syncStatus);
        matchesStatus = statuses.length > 0 && statuses.every((s) => s.status === 'synced');
      } else if (statusFilter === 'PENDING') {
        const statuses = Object.values(u.syncStatus);
        matchesStatus = statuses.some((s) => s.status === 'pending');
      } else if (statusFilter === 'ERROR') {
        const statuses = Object.values(u.syncStatus);
        matchesStatus = statuses.some((s) => s.status === 'error');
      }

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [users, searchTerm, selectedGroupFilter, statusFilter]);

  // Paginated slice
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Selection handlers
  const isAllCurrentPageSelected =
    paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedUserIds.has(u.id));
  const isSomeSelected =
    paginatedUsers.some((u) => selectedUserIds.has(u.id)) && !isAllCurrentPageSelected;

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const next = new Set(selectedUserIds);
      paginatedUsers.forEach((u) => next.delete(u.id));
      setSelectedUserIds(next);
    } else {
      const next = new Set(selectedUserIds);
      paginatedUsers.forEach((u) => next.add(u.id));
      setSelectedUserIds(next);
    }
  };

  const handleToggleUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedUserIds(next);
  };

  const handleClearSelection = () => {
    setSelectedUserIds(new Set());
  };

  const selectedUsersList = useMemo(() => {
    return users.filter((u) => selectedUserIds.has(u.id));
  }, [users, selectedUserIds]);

  // Batch action executions
  const handleExecuteBatchDelete = async () => {
    if (selectedUsersList.length === 0) return;
    if (confirm(`Deseja realmente remover os ${selectedUsersList.length} usuários selecionados de todos os roteadores?`)) {
      setBatchActionLoading(true);
      try {
        if (onBatchDeleteUsers) {
          await onBatchDeleteUsers(selectedUsersList);
        } else {
          for (const u of selectedUsersList) {
            await onDeleteUser(u);
          }
        }
        setSelectedUserIds(new Set());
      } finally {
        setBatchActionLoading(false);
      }
    }
  };

  const handleExecuteBatchSync = async () => {
    if (selectedUsersList.length === 0) return;
    setBatchActionLoading(true);
    try {
      if (onBatchSyncUsers) {
        await onBatchSyncUsers(selectedUsersList);
      } else {
        for (const u of selectedUsersList) {
          await onSyncUser(u);
        }
      }
      setSelectedUserIds(new Set());
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleExecuteBatchToggleDisabled = async (disabled: boolean) => {
    if (selectedUsersList.length === 0) return;
    setBatchActionLoading(true);
    try {
      if (onBatchToggleDisabled) {
        await onBatchToggleDisabled(selectedUsersList, disabled);
      } else {
        for (const u of selectedUsersList) {
          await onSaveUser({ ...u, disabled });
        }
      }
      setSelectedUserIds(new Set());
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleExecuteBatchGroupChange = async () => {
    if (selectedUsersList.length === 0 || !targetBatchGroupId) return;
    setBatchActionLoading(true);
    try {
      if (onBatchUpdateGroup) {
        await onBatchUpdateGroup(selectedUsersList, targetBatchGroupId);
      } else {
        for (const u of selectedUsersList) {
          await onSaveUser({ ...u, logicalGroupId: targetBatchGroupId });
        }
      }
      setBatchChangeGroupOpen(false);
      setSelectedUserIds(new Set());
    } finally {
      setBatchActionLoading(false);
    }
  };

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

  const hasRouters = routers.length > 0;

  return (
    <div className="space-y-4">
      {/* 0 Routers Warning Banner */}
      {!hasRouters && (
        <div className="p-4 rounded-2xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">Nenhum MikroTik cadastrado no tClavis</div>
              <div className="text-xs text-slate-300">
                Para criar ou sincronizar usuários de Hotspot, é necessário conectar ao menos um roteador RouterOS.
              </div>
            </div>
          </div>
          {onNavigateToRouters && (
            <button
              onClick={onNavigateToRouters}
              className="px-4 py-2 rounded-xl bg-accent-amber hover:bg-amber-500 text-background font-semibold text-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Network className="w-4 h-4" />
              <span>Conectar Primeiro MikroTik</span>
            </button>
          )}
        </div>
      )}

      {/* Action Header & Search Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuário ou comentário..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={selectedGroupFilter}
            onChange={(e) => {
              setSelectedGroupFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-xs focus:outline-none focus:border-primary font-medium"
          >
            <option value="ALL">Todos os Grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-xs focus:outline-none focus:border-primary font-medium"
          >
            <option value="ALL">Status: Todos</option>
            <option value="SYNCED">🟢 100% Síncronos</option>
            <option value="PENDING">🟡 Com Pendências</option>
            <option value="ERROR">🔴 Com Erros</option>
            <option value="DISABLED">⏸️ Desabilitados</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {hasRouters && (
            <button
              onClick={onOpenImport}
              className="px-3.5 py-2 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-slate-200 hover:text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow"
            >
              <DownloadCloud className="w-4 h-4 text-primary" />
              <span>Importar do MikroTik</span>
            </button>
          )}

          <button
            onClick={hasRouters ? onOpenCreate : undefined}
            disabled={!hasRouters}
            title={!hasRouters ? 'Cadastre ao menos 1 roteador primeiro' : 'Criar novo usuário'}
            className={`px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition shadow-glow-primary flex items-center space-x-1.5 ${
              !hasRouters ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Floating Batch Operations Bar */}
      {selectedUserIds.size > 0 && (
        <div className="p-3 bg-primary/10 border border-primary/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-glow-primary transition animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-white">
              {selectedUserIds.size} usuário(s) selecionado(s)
            </span>
            <button
              onClick={handleClearSelection}
              className="text-[11px] text-slate-400 hover:text-white underline ml-2"
            >
              Limpar Seleção
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExecuteBatchSync}
              disabled={batchActionLoading}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-border border border-surface-border text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${batchActionLoading ? 'animate-spin' : ''}`} />
              <span>Sincronizar Lote</span>
            </button>

            <button
              onClick={() => setBatchChangeGroupOpen(!batchChangeGroupOpen)}
              disabled={batchActionLoading}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-border border border-surface-border text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-accent-purple" />
              <span>Alterar Perfil</span>
            </button>

            <button
              onClick={() => handleExecuteBatchToggleDisabled(false)}
              disabled={batchActionLoading}
              className="px-3 py-1.5 rounded-xl bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/30 text-accent-emerald text-xs font-semibold transition flex items-center space-x-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Ativar</span>
            </button>

            <button
              onClick={() => handleExecuteBatchToggleDisabled(true)}
              disabled={batchActionLoading}
              className="px-3 py-1.5 rounded-xl bg-accent-amber/10 hover:bg-accent-amber/20 border border-accent-amber/30 text-accent-amber text-xs font-semibold transition flex items-center space-x-1"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Pausar</span>
            </button>

            <button
              onClick={handleExecuteBatchDelete}
              disabled={batchActionLoading}
              className="px-3 py-1.5 rounded-xl bg-accent-rose/15 hover:bg-accent-rose/25 border border-accent-rose/30 text-accent-rose text-xs font-semibold transition flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Lote</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Group Picker for Batch Action */}
      {batchChangeGroupOpen && selectedUserIds.size > 0 && (
        <div className="p-3 bg-surface-card border border-surface-border rounded-xl flex items-center space-x-3 text-xs">
          <span className="text-slate-300 font-semibold whitespace-nowrap">
            Novo Perfil para os {selectedUserIds.size} selecionados:
          </span>
          <select
            value={targetBatchGroupId}
            onChange={(e) => setTargetBatchGroupId(e.target.value)}
            className="px-3 py-1 bg-surface border border-surface-border rounded-lg text-white text-xs focus:outline-none focus:border-primary"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleExecuteBatchGroupChange}
            disabled={batchActionLoading}
            className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition"
          >
            Aplicar Perfil
          </button>
          <button
            onClick={() => setBatchChangeGroupOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-surface-border bg-surface/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-slate-400 hover:text-white transition"
                  title={isAllCurrentPageSelected ? 'Desmarcar todos' : 'Selecionar todos nesta página'}
                >
                  {isAllCurrentPageSelected ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : isSomeSelected ? (
                    <MinusSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3 px-4">Usuário</th>
              <th className="py-3 px-4">Senha</th>
              <th className="py-3 px-4">Grupo Lógico</th>
              <th className="py-3 px-4">Limites</th>
              <th className="py-3 px-4">Status de Sincronia nos MikroTiks</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-sm">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                  {!hasRouters ? (
                    <div className="space-y-3 max-w-sm mx-auto">
                      <Network className="w-10 h-10 text-slate-600 mx-auto" />
                      <div className="font-semibold text-white">Nenhum roteador conectado</div>
                      <div className="text-xs text-slate-400">
                        Adicione seu primeiro MikroTik para começar a gerenciar e sincronizar contas Hotspot.
                      </div>
                      {onNavigateToRouters && (
                        <button
                          onClick={onNavigateToRouters}
                          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition shadow-glow-primary"
                        >
                          Adicionar MikroTik
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 max-w-sm mx-auto">
                      <DownloadCloud className="w-10 h-10 text-slate-600 mx-auto" />
                      <div className="font-semibold text-white">Nenhum usuário encontrado</div>
                      <div className="text-xs text-slate-400">
                        Tente ajustar os filtros de busca ou crie uma nova conta Hotspot.
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => {
                const group = groups.find((g) => g.id === user.logicalGroupId);
                const isRevealed = revealedPasswords[user.id];
                const isSelected = selectedUserIds.has(user.id);

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-surface/30 transition ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleUser(user.id)}
                        className="text-slate-400 hover:text-white transition"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white font-mono">{user.username}</span>
                        {user.disabled && (
                          <span className="px-1.5 py-0.2 rounded bg-accent-amber/15 text-accent-amber text-[9px] font-bold border border-accent-amber/30">
                            Pausado
                          </span>
                        )}
                      </div>
                      {user.comment && <div className="text-xs text-slate-400 truncate max-w-xs">{user.comment}</div>}
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
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          title="Editar usuário e trocar senha/grupo"
                          onClick={() => onOpenEdit(user)}
                          className="p-1.5 rounded-lg bg-surface hover:bg-surface-border text-slate-300 hover:text-primary transition border border-surface-border"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

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

        {/* Pagination Bar */}
        {filteredUsers.length > 0 && (
          <div className="p-3 bg-surface/40 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Mostrando <strong>{paginatedUsers.length}</strong> de <strong>{filteredUsers.length}</strong> usuários
              {filteredUsers.length !== users.length && ` (filtrado de ${users.length} total)`}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span>Por página:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value, 10));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-surface-card border border-surface-border rounded-lg text-white text-xs focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg bg-surface-card border border-surface-border text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-white">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg bg-surface-card border border-surface-border text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
