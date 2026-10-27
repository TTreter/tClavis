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
  Key,
  Shield,
  Zap,
} from 'lucide-react';
import { RouterDevice, HotspotUser, LogicalGroup, LogicalServer } from '../../shared/types';
import { DashboardView } from './views/DashboardView';
import { UsersView } from './views/UsersView';
import { RoutersView } from './views/RoutersView';
import { MappingView } from './views/MappingView';
import { ActiveSessionsView } from './views/ActiveSessionsView';
import { VouchersView } from './views/VouchersView';
import { CreateUserModal } from './components/CreateUserModal';
import { CreateRouterModal } from './components/CreateRouterModal';
import { CreateMappingModal } from './components/CreateMappingModal';

// Type declaration for window.tclavisAPI
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
  const [isRouterModalOpen, setIsRouterModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

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

  const onlineRoutersCount = routers.filter((r) => r.status === 'online').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-surface-border bg-surface flex flex-col justify-between select-none">
        <div>
          {/* Logo Brand */}
          <div className="p-5 border-b border-surface-border flex items-center space-x-3">
            <img src="/tclavis-icon.svg" alt="tClavis" className="w-9 h-9 object-contain" />
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
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-surface-border bg-surface-card/40">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span>Sincronização</span>
            <span className="text-accent-emerald font-medium">Ativa</span>
          </div>
          <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full w-full animate-pulse" />
          </div>
          <div className="mt-3 text-[10px] text-slate-500 font-mono text-center">
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
    </div>
  );
}
