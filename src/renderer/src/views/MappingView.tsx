import React, { useState } from 'react';
import { GitFork, Plus, Layers, Trash2, ArrowRight } from 'lucide-react';
import { LogicalGroup, LogicalServer, RouterDevice } from '../../../shared/types';

interface Props {
  groups: LogicalGroup[];
  servers: LogicalServer[];
  routers: RouterDevice[];
  onOpenCreateGroupMapping: () => void;
  onDeleteGroup: (id: string) => Promise<void>;
  onDeleteServer: (id: string) => Promise<void>;
}

export const MappingView: React.FC<Props> = ({
  groups,
  servers,
  routers,
  onOpenCreateGroupMapping,
  onDeleteGroup,
  onDeleteServer,
}) => {
  const [tab, setTab] = useState<'groups' | 'servers'>('groups');

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <GitFork className="w-5 h-5 text-primary" />
            <span>Abstração & Mapeamento "De-Para"</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Linke grupos e servidores hotspot que possuem nomes diferentes em cada MikroTik
          </p>
        </div>

        <button
          onClick={onOpenCreateGroupMapping}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Grupo Global (De-Para)</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-surface-border">
        <button
          onClick={() => setTab('groups')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            tab === 'groups'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Grupos de Velocidade / Perfis ({groups.length})</span>
        </button>

        <button
          onClick={() => setTab('servers')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
            tab === 'servers'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <GitFork className="w-4 h-4" />
          <span>Servidores Hotspot Linkados ({servers.length})</span>
        </button>
      </div>

      {/* Tab 1: Groups De-Para */}
      {tab === 'groups' && (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-base">{group.name}</span>
                    {group.rateLimit && (
                      <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-xs font-mono font-semibold">
                        {group.rateLimit}
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{group.description}</p>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Excluir grupo "${group.name}"?`)) onDeleteGroup(group.id);
                  }}
                  className="text-slate-500 hover:text-accent-rose transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Mappings Grid */}
              <div className="mt-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Tradução de Perfil nos Roteadores:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {routers.map((router) => {
                    const mappedProfile = group.routerMappings[router.id] || 'default';
                    return (
                      <div
                        key={router.id}
                        className="bg-background/50 border border-surface-border/70 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-white text-xs">{router.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">Profile nativo no MK:</div>
                        </div>

                        <div className="flex items-center space-x-1.5 font-mono text-xs">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          <span className="bg-accent-purple/15 text-accent-purple border border-accent-purple/30 px-2.5 py-1 rounded-lg font-bold">
                            {mappedProfile}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Servers Linking */}
      {tab === 'servers' && (
        <div className="space-y-3">
          {servers.map((server) => (
            <div
              key={server.id}
              className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <div className="font-bold text-white text-base">{server.name}</div>
                  {server.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{server.description}</p>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Excluir servidor "${server.name}"?`)) onDeleteServer(server.id);
                  }}
                  className="text-slate-500 hover:text-accent-rose transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Mappings Grid */}
              <div className="mt-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Linkagem de Instância Hotspot nos Roteadores:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {routers.map((router) => {
                    const mappedServer = server.routerMappings[router.id] || 'all';
                    return (
                      <div
                        key={router.id}
                        className="bg-background/50 border border-surface-border/70 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-white text-xs">{router.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">Servidor MikroTik:</div>
                        </div>

                        <div className="flex items-center space-x-1.5 font-mono text-xs">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          <span className="bg-primary/15 text-primary border border-primary/30 px-2.5 py-1 rounded-lg font-bold">
                            {mappedServer}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
