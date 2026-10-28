import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Network,
  GitFork,
  Radio,
  Ticket,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Tv,
  Settings,
  Lock,
  Unlock,
} from 'lucide-react';
import { RouterDevice, HotspotUser, LogicalGroup, LogicalServer, ParityDiscrepancy, IpBinding, ImportUsersBatchOptions } from '../../shared/types';
import { DashboardView } from './views/DashboardView';
import { UsersView } from './views/UsersView';
import { RoutersView } from './views/RoutersView';
import { MappingView } from './views/MappingView';
import { ActiveSessionsView } from './views/ActiveSessionsView';
import { VouchersView } from './views/VouchersView';
import { IpBindingView } from './views/IpBindingView';
import { SettingsView } from './views/SettingsView';
import { CreateUserModal } from './components/CreateUserModal';
import { EditUserModal } from './components/EditUserModal';
import { CreateRouterModal } from './components/CreateRouterModal';
import { CreateMappingModal } from './components/CreateMappingModal';
import { EditMappingModal } from './components/EditMappingModal';
import { ImportUsersModal } from './components/ImportUsersModal';
import { ParityAuditModal } from './components/ParityAuditModal';
import { BackupModal } from './components/BackupModal';
import { PinSetupModal } from './components/PinSetupModal';
import { PinPromptModal } from './components/PinPromptModal';
import { VoucherPurgeModal } from './components/VoucherPurgeModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Logo } from './components/Logo';

declare global {
  interface Window {
    tclavisAPI?: any;
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [routers, setRouters] = useState<RouterDevice[]>([]);
  const [users, setUsers] = useState<HotspotUser[]>([]);
  const [groups, setGroups] = useState<LogicalGroup[]>([]);
  const [servers, setServers] = useState<LogicalServer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<HotspotUser | null>(null);
  const [isRouterModalOpen, setIsRouterModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isEditMappingModalOpen, setIsEditMappingModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LogicalGroup | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRouterId, setImportRouterId] = useState<string | undefined>(undefined);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Security & Master PIN Session State
  const [isPinSet, setIsPinSet] = useState(true);
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const [isPinPromptOpen, setIsPinPromptOpen] = useState(false);
  const [unlockedUntil, setUnlockedUntil] = useState(0);
  const [pinTimeoutMinutes, setPinTimeoutMinutes] = useState(5);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void> | void) | null>(null);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check PIN setup and app settings
  const checkPinSetup = async () => {
    try {
      if (window.tclavisAPI?.hasMasterPin) {
        const hasPin = await window.tclavisAPI.hasMasterPin();
        setIsPinSet(hasPin);
        if (!hasPin) {
          setIsPinSetupOpen(true);
        }
      }
      if (window.tclavisAPI?.getSettings) {
        const settings = await window.tclavisAPI.getSettings();
        if (settings?.pin_timeout_minutes) {
          setPinTimeoutMinutes(Number(settings.pin_timeout_minutes) || 5);
        }
      }
    } catch (err) {
      console.error('Falha ao verificar PIN:', err);
    }
  };

  // Session timer countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (unlockedUntil > now) {
        setRemainingTime(Math.ceil((unlockedUntil - now) / 1000));
      } else {
        if (unlockedUntil !== 0) {
          setUnlockedUntil(0);
          showToast('Sessão autorizada expirou. As edições foram bloqueadas.', 'info');
        }
        setRemainingTime(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [unlockedUntil]);

  const isSessionUnlocked = Date.now() < unlockedUntil;

  const requireAuth = (action: () => void | Promise<void>): Promise<void> => {
    return new Promise((resolve) => {
      const execute = async () => {
        try {
          await action();
        } finally {
          resolve();
        }
      };

      if (!isPinSet) {
        setIsPinSetupOpen(true);
        resolve();
        return;
      }
      if (Date.now() < unlockedUntil) {
        execute();
        return;
      }
      setPendingAction(() => execute);
      setIsPinPromptOpen(true);
    });
  };

  const handlePinSuccess = (timeoutMins: number) => {
    const durationMs = timeoutMins > 0 ? timeoutMins * 60 * 1000 : 0;
    setUnlockedUntil(Date.now() + durationMs);
    setIsPinPromptOpen(false);
    showToast(
      timeoutMins > 0
        ? `Sessão desbloqueada por ${timeoutMins} minutos.`
        : 'Ação autorizada.',
      'success'
    );
    if (pendingAction) {
      const act = pendingAction;
      setPendingAction(null);
      act();
    }
  };

  const handleManualLock = () => {
    setUnlockedUntil(0);
    showToast('Sessão bloqueada manualmente.', 'info');
  };

  // Load all initial data
  const loadData = async () => {
    checkPinSetup();
    if (!window.tclavisAPI) return;
    try {
      const [r, u, g, s] = await Promise.all([
        window.tclavisAPI.getRouters(),
        window.tclavisAPI.getUsers(),
        window.tclavisAPI.getGroups(),
        window.tclavisAPI.getServers(),
      ]);
      setRouters(r || []);
      setUsers(u || []);
      setGroups(g || []);
      setServers(s || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to background sync updates
    if (window.tclavisAPI?.onSyncUpdated) {
      const unsubscribe = window.tclavisAPI.onSyncUpdated(() => {
        loadData();
        showToast('Sincronização em segundo plano concluída!', 'info');
      });
      return () => unsubscribe();
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close any open modal
      if (e.key === 'Escape') {
        setIsUserModalOpen(false);
        setIsEditUserModalOpen(false);
        setIsRouterModalOpen(false);
        setIsMappingModalOpen(false);
        setIsEditMappingModalOpen(false);
        setIsImportModalOpen(false);
        setIsAuditModalOpen(false);
        setIsBackupModalOpen(false);
      }
      // Ctrl+N / Cmd+N: New user
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault();
        if (routers.length === 0) {
          showToast('Adicione ao menos um MikroTik antes de cadastrar usuários.', 'warning');
          setIsRouterModalOpen(true);
        } else {
          setIsUserModalOpen(true);
        }
      }
      // Ctrl+Shift+A: Parity audit
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAuditModalOpen(true);
      }
      // Ctrl+R / F5: Refresh
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        loadData();
        showToast('Dados e status atualizados!', 'info');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleSaveUser = async (user: HotspotUser) => {
    try {
      await window.tclavisAPI?.saveUser(user);
      await loadData();
      showToast(`Usuário "${user.username}" salvo e propagado ao cluster!`, 'success');
    } catch (err: any) {
      showToast('Erro ao salvar usuário: ' + err.message, 'error');
      throw err;
    }
  };

  const handleDeleteUser = async (user: HotspotUser) => {
    try {
      await window.tclavisAPI?.deleteUser(user);
      await loadData();
      showToast(`Usuário "${user.username}" removido do cluster!`, 'success');
    } catch (err: any) {
      showToast('Erro ao excluir usuário: ' + err.message, 'error');
    }
  };

  const handleSyncUser = async (user: HotspotUser) => {
    try {
      await window.tclavisAPI?.syncUser(user);
      await loadData();
      showToast(`Sincronização forçada para "${user.username}"!`, 'info');
    } catch (err: any) {
      showToast('Erro ao sincronizar: ' + err.message, 'error');
    }
  };

  const handleSaveRouter = async (router: RouterDevice) => {
    try {
      await window.tclavisAPI?.saveRouter(router);
      await loadData();
      showToast(`MikroTik "${router.name}" configurado!`, 'success');
    } catch (err: any) {
      showToast('Erro ao salvar roteador: ' + err.message, 'error');
    }
  };

  const handleDeleteRouter = async (id: string) => {
    try {
      await window.tclavisAPI?.deleteRouter(id);
      await loadData();
      showToast('Roteador removido.', 'info');
    } catch (err: any) {
      showToast('Erro ao remover: ' + err.message, 'error');
    }
  };

  const handleTestRouter = async (router: RouterDevice) => {
    const res = await window.tclavisAPI?.testRouter(router);
    await loadData();
    if (res?.success) {
      showToast(`Conectado a ${router.name} (${res.latencyMs}ms)!`, 'success');
    } else {
      showToast(`Falha em ${router.name}: ${res?.error || 'Inacessível'}`, 'error');
    }
    return res;
  };

  const handleSaveGroup = async (group: LogicalGroup) => {
    try {
      await window.tclavisAPI?.saveGroup(group);
      await loadData();
      showToast(`Mapeamento De-Para "${group.name}" salvo!`, 'success');
    } catch (err: any) {
      showToast('Erro ao salvar grupo: ' + err.message, 'error');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await window.tclavisAPI?.deleteGroup(id);
      await loadData();
      showToast('Mapeamento removido.', 'info');
    } catch (err: any) {
      showToast('Erro ao excluir grupo: ' + err.message, 'error');
    }
  };

  const handleDeleteServer = async (id: string) => {
    try {
      await window.tclavisAPI?.deleteServer(id);
      await loadData();
      showToast('Servidor lógico removido.', 'info');
    } catch (err: any) {
      showToast('Erro ao excluir servidor: ' + err.message, 'error');
    }
  };

  const handleOpenImport = (routerId?: string) => {
    setImportRouterId(routerId);
    setIsImportModalOpen(true);
  };

  const handleImportBatch = async (options: ImportUsersBatchOptions) => {
    try {
      if (!window.tclavisAPI?.importUsersBatch) return { importedCount: 0, groupsCreated: 0 };
      const res = await window.tclavisAPI.importUsersBatch(options);
      await loadData();
      showToast(
        `✅ ${res.importedCount} usuário(s) importados! ${res.groupsCreated > 0 ? `(${res.groupsCreated} novo(s) grupo(s) criado(s))` : ''}`,
        'success'
      );
      return res;
    } catch (err: any) {
      showToast('Erro ao importar usuários: ' + err.message, 'error');
      throw err;
    }
  };

  const handleOpenEditGroup = (group: LogicalGroup) => {
    setEditingGroup(group);
    setIsEditMappingModalOpen(true);
  };

  const handleBatchCreateUsers = async (newUsers: HotspotUser[]) => {
    try {
      if (window.tclavisAPI?.saveUsersBatch) {
        await window.tclavisAPI.saveUsersBatch(newUsers);
      } else {
        for (const u of newUsers) {
          await window.tclavisAPI?.saveUser(u);
        }
      }
      await loadData();
      showToast(`⚡ ${newUsers.length} vouchers gerados e sincronizados em lote!`, 'success');
    } catch (err: any) {
      showToast('Erro no lote de vouchers: ' + err.message, 'error');
    }
  };

  const handleBatchDeleteUsers = async (usersToDelete: HotspotUser[]) => {
    try {
      if (window.tclavisAPI?.deleteUsersBatch) {
        await window.tclavisAPI.deleteUsersBatch(usersToDelete);
      } else {
        for (const u of usersToDelete) {
          await window.tclavisAPI?.deleteUser(u);
        }
      }
      await loadData();
      showToast(`✅ ${usersToDelete.length} usuários removidos do cluster!`, 'success');
    } catch (err: any) {
      showToast('Erro ao remover em lote: ' + err.message, 'error');
    }
  };

  const handleBatchSyncUsers = async (usersToSync: HotspotUser[]) => {
    try {
      for (const u of usersToSync) {
        await window.tclavisAPI?.syncUser(u);
      }
      await loadData();
      showToast(`🔄 ${usersToSync.length} usuários sincronizados!`, 'success');
    } catch (err: any) {
      showToast('Erro ao sincronizar em lote: ' + err.message, 'error');
    }
  };

  const handleBatchUpdateGroup = async (usersToUpdate: HotspotUser[], groupId: string) => {
    try {
      const updated = usersToUpdate.map((u) => ({ ...u, logicalGroupId: groupId }));
      if (window.tclavisAPI?.saveUsersBatch) {
        await window.tclavisAPI.saveUsersBatch(updated);
      } else {
        for (const u of updated) {
          await window.tclavisAPI?.saveUser(u);
        }
      }
      await loadData();
      showToast(`🛡️ Perfil atualizado para ${usersToUpdate.length} usuários!`, 'success');
    } catch (err: any) {
      showToast('Erro ao atualizar grupo: ' + err.message, 'error');
    }
  };

  const handleBatchToggleDisabled = async (usersToToggle: HotspotUser[], disabled: boolean) => {
    try {
      const updated = usersToToggle.map((u) => ({ ...u, disabled }));
      if (window.tclavisAPI?.saveUsersBatch) {
        await window.tclavisAPI.saveUsersBatch(updated);
      } else {
        for (const u of updated) {
          await window.tclavisAPI?.saveUser(u);
        }
      }
      await loadData();
      showToast(
        `${usersToToggle.length} usuários ${disabled ? 'pausados/desabilitados' : 'ativados'}!`,
        'info'
      );
    } catch (err: any) {
      showToast('Erro ao alterar status: ' + err.message, 'error');
    }
  };

  const handleKickSession = async (routerId: string, sessionId: string) => {
    try {
      await window.tclavisAPI?.kickSession(routerId, sessionId);
      showToast('Sessão desconectada (Kick)!', 'success');
    } catch (err: any) {
      showToast('Erro ao derrubar sessão: ' + err.message, 'error');
    }
  };

  const handleFetchSessions = async () => {
    if (!window.tclavisAPI) return [];
    return window.tclavisAPI.getActiveSessions();
  };

  const handleRunAudit = async () => {
    if (!window.tclavisAPI) return { timestamp: '', totalChecked: 0, totalDiscrepancies: 0, discrepancies: [] };
    return window.tclavisAPI.runAudit();
  };

  const handleRepairDiscrepancies = async (discrepancies: ParityDiscrepancy[]) => {
    if (!window.tclavisAPI) return 0;
    return window.tclavisAPI.repairDiscrepancies(discrepancies);
  };

  const handleFetchBindings = async () => {
    if (!window.tclavisAPI) return [];
    return window.tclavisAPI.getIpBindings();
  };

  const handleSaveBinding = async (binding: Omit<IpBinding, 'id'>) => {
    await window.tclavisAPI?.saveIpBinding(binding);
  };

  const handleDeleteBinding = async (macAddress: string) => {
    await window.tclavisAPI?.deleteIpBinding(macAddress);
  };

  const onlineRoutersCount = routers.filter((r) => r.status === 'online').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-surface-border bg-surface flex flex-col justify-between select-none">
        <div>
          {/* Logo Brand */}
          <div className="p-5 border-b border-surface-border flex items-center space-x-3">
            <Logo className="w-10 h-10 flex-shrink-0" />
            <div>
              <span className="font-extrabold text-base tracking-wider text-white">tCLAVIS</span>
              <span className="block text-[10px] text-primary font-mono tracking-widest uppercase">
                HOTSPOT SYNC
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'dashboard'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow-primary'
                  : 'text-slate-400 hover:text-white hover:bg-surface-card'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Painel Geral</span>
            </button>

            <button
              onClick={() => setCurrentView('users')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'users'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow-primary'
                  : 'text-slate-400 hover:text-white hover:bg-surface-card'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4" />
                <span>Usuários Hotspot</span>
              </div>
              <span className="text-[10px] bg-surface-card px-2 py-0.5 rounded-full text-slate-300">
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentView('routers')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'routers'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow-primary'
                  : 'text-slate-400 hover:text-white hover:bg-surface-card'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Network className="w-4 h-4" />
                <span>Roteadores ({routers.length})</span>
              </div>
              <span className="text-[10px] text-accent-emerald font-mono">
                {onlineRoutersCount}/{routers.length} ON
              </span>
            </button>

            <button
              onClick={() => setCurrentView('mapping')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'mapping'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow-primary'
                  : 'text-slate-400 hover:text-white hover:bg-surface-card'
              }`}
            >
              <GitFork className="w-4 h-4" />
              <span>Mapeamento De-Para</span>
            </button>

            <button
              onClick={() => setCurrentView('sessions')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'sessions'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow-primary'
                  : 'text-slate-400 hover:text-white hover:bg-surface-card'
              }`}
            >
              <Radio className="w-4 h-4 text-accent-emerald" />
              <span>Sessões Ativas</span>
            </button>

            <button
              onClick={() => setCurrentView('vouchers')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'vouchers'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow-primary'
                  : 'text-slate-400 hover:text-white hover:bg-surface-card'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Gerador de Vouchers</span>
            </button>

            <button
              onClick={() => setCurrentView('bindings')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'bindings'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow-primary'
                  : 'text-slate-400 hover:text-white hover:bg-surface-card'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-accent-emerald" />
              <span>Dispositivos (Bypass)</span>
            </button>

            <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'settings'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow-primary'
                  : 'text-slate-400 hover:text-white hover:bg-surface-card'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-surface-border bg-surface-card/40 space-y-2">
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="w-full px-3 py-2 rounded-xl bg-accent-amber/10 hover:bg-accent-amber/20 border border-accent-amber/20 text-accent-amber text-xs font-semibold transition flex items-center justify-center space-x-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Auditoria de Paridade</span>
          </button>

          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="w-full px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-border border border-surface-border text-slate-300 hover:text-white text-xs font-medium transition flex items-center justify-center space-x-1.5"
          >
            <span>Backup & Restauração</span>
          </button>

          <div className="text-[10px] text-slate-500 font-mono text-center pt-1">
            tClavis v2.1.0 Desktop • RouterOS
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-surface-border bg-surface px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-medium">Cluster Selecionado:</span>
            <div className="inline-flex items-center px-3 py-1 rounded-xl bg-surface-card border border-surface-border text-xs text-white space-x-2">
              <span className="w-2 h-2 rounded-full bg-accent-emerald animate-ping" />
              <span className="font-semibold">Cluster Principal ({routers.length} MikroTiks)</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Session Lock Indicator */}
            {isSessionUnlocked ? (
              <div className="flex items-center space-x-2 bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald px-3 py-1.5 rounded-xl text-xs font-semibold">
                <Unlock className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  Autorizado ({Math.floor(remainingTime / 60)}:
                  {String(remainingTime % 60).padStart(2, '0')})
                </span>
                <button
                  onClick={handleManualLock}
                  title="Bloquear agora"
                  className="ml-1 text-[10px] bg-accent-emerald/20 hover:bg-accent-emerald/30 px-1.5 py-0.5 rounded text-accent-emerald hover:text-white transition"
                >
                  Bloquear
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsPinPromptOpen(true)}
                className="flex items-center space-x-1.5 bg-surface-card hover:bg-surface-border border border-surface-border text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition"
              >
                <Lock className="w-3.5 h-3.5 text-accent-amber" />
                <span>Bloqueado (PIN)</span>
              </button>
            )}

            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-accent-amber/10 hover:bg-accent-amber/20 border border-accent-amber/30 text-accent-amber text-xs font-semibold transition flex items-center space-x-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Auditar Paridade</span>
            </button>

            <button
              onClick={loadData}
              title="Recarregar dados"
              className="p-2 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-slate-300 hover:text-white transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                requireAuth(() => {
                  if (routers.length === 0) {
                    showToast('Adicione ao menos um MikroTik antes de cadastrar usuários.', 'warning');
                    setIsRouterModalOpen(true);
                  } else {
                    setIsUserModalOpen(true);
                  }
                })
              }
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition shadow-glow-primary flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Usuário</span>
            </button>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'dashboard' && (
            <DashboardView
              routers={routers}
              users={users}
              groups={groups}
              onNavigate={setCurrentView}
              onOpenCreateUser={() => {
                if (routers.length === 0) {
                  showToast('Cadastre ao menos um roteador antes de criar usuários.', 'warning');
                  setIsRouterModalOpen(true);
                } else {
                  setIsUserModalOpen(true);
                }
              }}
              onOpenCreateVoucher={() => {
                if (routers.length === 0) {
                  showToast('Cadastre ao menos um roteador antes de gerar vouchers.', 'warning');
                  setIsRouterModalOpen(true);
                } else {
                  setCurrentView('vouchers');
                }
              }}
              onOpenCreateRouter={() => setIsRouterModalOpen(true)}
            />
          )}

          {currentView === 'users' && (
            <UsersView
              users={users}
              groups={groups}
              routers={routers}
              onOpenCreate={() => requireAuth(() => setIsUserModalOpen(true))}
              onOpenEdit={(user) => {
                requireAuth(() => {
                  setEditingUser(user);
                  setIsEditUserModalOpen(true);
                });
              }}
              onOpenImport={() => handleOpenImport()}
              onDeleteUser={(user) => requireAuth(() => handleDeleteUser(user))}
              onSyncUser={handleSyncUser}
              onSaveUser={handleSaveUser}
              onNavigateToRouters={() => setCurrentView('routers')}
              onBatchDeleteUsers={(users) => requireAuth(() => handleBatchDeleteUsers(users))}
              onBatchSyncUsers={handleBatchSyncUsers}
              onBatchUpdateGroup={(users, gId) => requireAuth(() => handleBatchUpdateGroup(users, gId))}
              onBatchToggleDisabled={(users, d) => requireAuth(() => handleBatchToggleDisabled(users, d))}
              requireAuth={requireAuth}
              isUnlocked={isSessionUnlocked}
            />
          )}

          {currentView === 'routers' && (
            <RoutersView
              routers={routers}
              onOpenCreate={() => requireAuth(() => setIsRouterModalOpen(true))}
              onDeleteRouter={(id) => requireAuth(() => handleDeleteRouter(id))}
              onTestRouter={handleTestRouter}
              onOpenImportRouter={(routerId) => handleOpenImport(routerId)}
            />
          )}

          {currentView === 'mapping' && (
            <MappingView
              groups={groups}
              servers={servers}
              routers={routers}
              onOpenCreateGroupMapping={() => requireAuth(() => setIsMappingModalOpen(true))}
              onOpenEditGroup={(group) => requireAuth(() => handleOpenEditGroup(group))}
              onDeleteGroup={(id) => requireAuth(() => handleDeleteGroup(id))}
              onDeleteServer={(id) => requireAuth(() => handleDeleteServer(id))}
              onNavigateToRouters={() => setCurrentView('routers')}
            />
          )}

          {currentView === 'sessions' && (
            <ActiveSessionsView
              onKickSession={handleKickSession}
              onFetchSessions={handleFetchSessions}
            />
          )}

          {currentView === 'vouchers' && (
            <VouchersView
              groups={groups}
              servers={servers}
              routers={routers}
              onBatchCreateUsers={(users) => requireAuth(() => handleBatchCreateUsers(users))}
            />
          )}

          {currentView === 'bindings' && (
            <IpBindingView
              routers={routers}
              onFetchBindings={handleFetchBindings}
              onSaveBinding={handleSaveBinding}
              onDeleteBinding={handleDeleteBinding}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              onOpenPurgeModal={() => requireAuth(() => setIsPurgeModalOpen(true))}
              onShowToast={showToast}
              requireAuth={requireAuth}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
        groups={groups}
        servers={servers}
        routers={routers}
      />

      <EditUserModal
        isOpen={isEditUserModalOpen}
        user={editingUser}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        groups={groups}
        servers={servers}
        routers={routers}
      />

      <CreateRouterModal
        isOpen={isRouterModalOpen}
        onClose={() => setIsRouterModalOpen(false)}
        onSave={handleSaveRouter}
        onTest={handleTestRouter}
      />

      <CreateMappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        onSave={handleSaveGroup}
        routers={routers}
        onInspectRouter={(r) => window.tclavisAPI?.inspectRouter(r)}
      />

      <EditMappingModal
        isOpen={isEditMappingModalOpen}
        group={editingGroup}
        onClose={() => {
          setIsEditMappingModalOpen(false);
          setEditingGroup(null);
        }}
        onSave={handleSaveGroup}
        routers={routers}
        onInspectRouter={(r) => window.tclavisAPI?.inspectRouter(r)}
      />

      <ImportUsersModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportRouterId(undefined);
        }}
        routers={routers}
        onImportBatch={handleImportBatch}
        initialRouterId={importRouterId}
      />

      <ParityAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        onRunAudit={handleRunAudit}
        onRepair={handleRepairDiscrepancies}
        onRefreshData={loadData}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onExport={(pass) => window.tclavisAPI?.exportBackup(pass)}
        onImport={(json, pass) => window.tclavisAPI?.importBackup(json, pass)}
        onNotify={showToast}
        onRefreshData={loadData}
      />

      <PinSetupModal
        isOpen={isPinSetupOpen}
        onPinConfigured={() => {
          setIsPinSetupOpen(false);
          setIsPinSet(true);
          showToast('PIN Mestre configurado com sucesso! Guarde-o com segurança.', 'success');
        }}
      />

      <PinPromptModal
        isOpen={isPinPromptOpen}
        timeoutMinutes={pinTimeoutMinutes}
        onSuccess={handlePinSuccess}
        onClose={() => {
          setIsPinPromptOpen(false);
          setPendingAction(null);
        }}
      />

      <VoucherPurgeModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        onPurged={(count) => {
          showToast(`${count} vouchers obsoletos foram expurgados com sucesso!`, 'success');
          loadData();
        }}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
