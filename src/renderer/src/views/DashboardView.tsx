import React from 'react';
import { Network, Users, RefreshCw, Zap, ShieldCheck, Activity, ArrowUpRight, CheckCircle2, Clock, Plus, AlertCircle } from 'lucide-react';
import { RouterDevice, HotspotUser, LogicalGroup } from '../../../shared/types';

interface Props {
  routers: RouterDevice[];
  users: HotspotUser[];
  groups: LogicalGroup[];
  onNavigate: (view: string) => void;
  onOpenCreateUser: () => void;
  onOpenCreateVoucher: () => void;
  onOpenCreateRouter?: () => void;
}

export const DashboardView: React.FC<Props> = ({
  routers,
  users,
  groups,
  onNavigate,
  onOpenCreateUser,
  onOpenCreateVoucher,
  onOpenCreateRouter,
}) => {
  const onlineRouters = routers.filter((r) => r.status === 'online').length;
  const fullySyncedUsers = users.filter((u) => {
    const statuses = Object.values(u.syncStatus);
    return statuses.length > 0 && statuses.every((s) => s.status === 'synced');
  }).length;

  const hasRouters = routers.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-card via-surface-card to-primary/10 border border-surface-border p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" />
              <span>{hasRouters ? 'Cluster de Hotspot Ativo' : 'Boas-vindas ao tClavis'}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              tClavis — Gestão Multi-MikroTik
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {hasRouters
                ? `Sincronizando usuários, senhas e perfis entre ${routers.length} roteador(es) RouterOS.`
                : 'Conecte seus roteadores MikroTik para sincronizar usuários, senhas e perfis em tempo real.'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {hasRouters ? (
              <>
                <button
                  onClick={onOpenCreateVoucher}
                  className="px-4 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-slate-200 text-sm font-medium transition flex items-center space-x-2"
                >
                  <span>Gerar Vouchers</span>
                </button>
                <button
                  onClick={onOpenCreateUser}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Novo Usuário</span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenCreateRouter || (() => onNavigate('routers'))}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Primeiro MikroTik</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-surface-card border border-surface-border p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Roteadores no Cluster</span>
            <Network className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline space-x-2">
            <span>{onlineRouters}</span>
            <span className="text-xs text-slate-400 font-normal">/ {routers.length} online</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-accent-emerald">
            {hasRouters ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                <span>Topologia operacional</span>
              </>
            ) : (
              <span className="text-slate-400">Nenhuma caixa cadastrada</span>
            )}
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-surface-card border border-surface-border p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Usuários Hotspot</span>
            <Users className="w-4 h-4 text-accent-purple" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline space-x-2">
            <span>{users.length}</span>
            <span className="text-xs text-slate-400 font-normal">cadastrados</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400">
            <span>{fullySyncedUsers} 100% síncronos</span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-surface-card border border-surface-border p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Grupos Lógicos (De-Para)</span>
            <ShieldCheck className="w-4 h-4 text-accent-emerald" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline space-x-2">
            <span>{groups.length}</span>
            <span className="text-xs text-slate-400 font-normal">mapeamentos</span>
          </div>
          <div
            className="mt-2 flex items-center text-[11px] text-primary cursor-pointer hover:underline"
            onClick={() => onNavigate('mapping')}
          >
            <span>Configurar Perfis</span>
            <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-surface-card border border-surface-border p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Sincronização</span>
            <RefreshCw className="w-4 h-4 text-accent-amber" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline space-x-2">
            <span>0</span>
            <span className="text-xs text-slate-400 font-normal">pendências</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-accent-emerald">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>Fila limpa e atualizada</span>
          </div>
        </div>
      </div>

      {/* Routers Health Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Status dos Roteadores no Cluster
          </h2>
          <button
            onClick={() => onNavigate('routers')}
            className="text-xs text-primary hover:underline flex items-center space-x-1"
          >
            <span>Gerenciar Caixas</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {routers.length === 0 ? (
          <div className="p-8 text-center bg-surface-card border border-surface-border rounded-2xl space-y-2">
            <Network className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="font-semibold text-white text-sm">Nenhum roteador cadastrado</div>
            <div className="text-xs text-slate-400 max-w-sm mx-auto">
              Adicione suas caixas MikroTik para monitorar uptime, latência e sincronismo das sessões.
            </div>
            <button
              onClick={onOpenCreateRouter || (() => onNavigate('routers'))}
              className="mt-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition shadow-glow-primary inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar MikroTik</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {routers.map((router) => (
              <div
                key={router.id}
                className="bg-surface-card border border-surface-border rounded-2xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white text-sm">{router.name}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        router.status === 'online'
                          ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/30'
                          : 'bg-accent-rose/10 text-accent-rose border border-accent-rose/30'
                      }`}
                    >
                      {router.status === 'online' ? '🟢 Online' : '🔴 Desconectado'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono space-y-1">
                    <div>Host: {router.host}:{router.port}</div>
                    <div>Versão: {router.routerOsVersion || 'RouterOS'}</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span>{router.latencyMs ? `${router.latencyMs}ms` : '---'}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{router.uptime || 'Uptime: --'}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
