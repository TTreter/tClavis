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
} from 'lucide-react';
import { RouterDevice, HotspotUser, LogicalGroup, LogicalServer, ParityDiscrepancy, IpBinding } from '../../shared/types';
import { DashboardView } from './views/DashboardView';
import { UsersView } from './views/UsersView';
import { RoutersView } from './views/RoutersView';
import { MappingView } from './views/MappingView';
import { ActiveSessionsView } from './views/ActiveSessionsView';
import { VouchersView } from './views/VouchersView';
import { IpBindingView } from './views/IpBindingView';
import { CreateUserModal } from './components/CreateUserModal';
import { EditUserModal } from './components/EditUserModal';
import { CreateRouterModal } from './components/CreateRouterModal';
import { CreateMappingModal } from './components/CreateMappingModal';
import { ParityAuditModal } from './components/ParityAuditModal';
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
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Load all initial data
  const loadData = async () => {
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
      });
      return () => unsubscribe();
    }
  }, []);

  // Handlers
  const handleSaveUser = async (user: HotspotUser) => {
    await window.tclavisAPI?.saveUser(user);
    await loadData();
  };

  const handleDeleteUser = async (user: HotspotUser) => {
    await window.tclavisAPI?.deleteUser(user);
    await loadData();
  };

  const handleSyncUser = async (user: HotspotUser) => {
    await window.tclavisAPI?.syncUser(user);
    await loadData();
  };

  const handleSaveRouter = async (router: RouterDevice) => {
    await window.tclavisAPI?.saveRouter(router);
    await loadData();
  };

  const handleDeleteRouter = async (id: string) => {
    await window.tclavisAPI?.deleteRouter(id);
    await loadData();
  };

  const handleTestRouter = async (router: RouterDevice) => {
    const res = await window.tclavisAPI?.testRouter(router);
    await loadData();
    return res;
  };

  const handleSaveGroup = async (group: LogicalGroup) => {
    await window.tclavisAPI?.saveGroup(group);
    await loadData();
  };

  const handleDeleteGroup = async (id: string) => {
    await window.tclavisAPI?.deleteGroup(id);
    await loadData();
  };

  const handleDeleteServer = async (id: string) => {
    await window.tclavisAPI?.deleteServer(id);
    await loadData();
  };

  const handleBatchCreateUsers = async (newUsers: HotspotUser[]) => {
    for (const u of newUsers) {
      await window.tclavisAPI?.saveUser(u);
    }
    await loadData();
  };

  const handleKickSession = async (routerId: string, sessionId: string) => {
    await window.tclavisAPI?.kickSession(routerId, sessionId);
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

          <div className="text-[10px] text-slate-500 font-mono text-center pt-1">
            tClavis v1.0.0 Desktop • RouterOS
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
              onClick={() => setIsUserModalOpen(true)}
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
              onOpenCreateUser={() => setIsUserModalOpen(true)}
              onOpenCreateVoucher={() => setCurrentView('vouchers')}
            />
          )}

          {currentView === 'users' && (
            <UsersView
              users={users}
              groups={groups}
              routers={routers}
              onOpenCreate={() => setIsUserModalOpen(true)}
              onOpenEdit={(user) => {
                setEditingUser(user);
                setIsEditUserModalOpen(true);
              }}
              onDeleteUser={handleDeleteUser}
              onSyncUser={handleSyncUser}
              onSaveUser={handleSaveUser}
            />
          )}

          {currentView === 'routers' && (
            <RoutersView
              routers={routers}
              onOpenCreate={() => setIsRouterModalOpen(true)}
              onDeleteRouter={handleDeleteRouter}
              onTestRouter={handleTestRouter}
            />
          )}

          {currentView === 'mapping' && (
            <MappingView
              groups={groups}
              servers={servers}
              routers={routers}
              onOpenCreateGroupMapping={() => setIsMappingModalOpen(true)}
              onDeleteGroup={handleDeleteGroup}
              onDeleteServer={handleDeleteServer}
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
              onBatchCreateUsers={handleBatchCreateUsers}
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

      <ParityAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        onRunAudit={handleRunAudit}
        onRepair={handleRepairDiscrepancies}
        onRefreshData={loadData}
      />
    </div>
  );
}
