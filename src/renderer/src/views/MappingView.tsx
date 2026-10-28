import React, { useState } from 'react';
import { GitFork, Plus, Layers, Trash2, ArrowRight, Edit3, AlertTriangle, Info, Network } from 'lucide-react';
import { LogicalGroup, LogicalServer, RouterDevice } from '../../../shared/types';

interface Props {
  groups: LogicalGroup[];
  servers: LogicalServer[];
  routers: RouterDevice[];
  onOpenCreateGroupMapping: () => void;
  onOpenEditGroup: (group: LogicalGroup) => void;
  onDeleteGroup: (id: string) => Promise<void>;
  onDeleteServer: (id: string) => Promise<void>;
  onNavigateToRouters?: () => void;
}

export const MappingView: React.FC<Props> = ({
  groups,
  servers,
  routers,
  onOpenCreateGroupMapping,
  onOpenEditGroup,
  onDeleteGroup,
  onDeleteServer,
  onNavigateToRouters,
}) => {
  const [tab, setTab] = useState<'groups' | 'servers'>('groups');

  const hasAtLeastTwoRouters = routers.length >= 2;

  return (
    <div className="space-y-6">
      {/* 0 Routers Warning Banner */}
      {routers.length === 0 && (
        <div className="p-4 rounded-2xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">Nenhum roteador cadastrado</div>
              <div className="text-xs text-slate-300">
                Cadastre pelo menos 2 roteadores MikroTik para estabelecer regras de tradução De-Para entre perfis.
              </div>
            </div>
          </div>
          {onNavigateToRouters && (
            <button
              onClick={onNavigateToRouters}
              className="px-4 py-2 rounded-xl bg-accent-amber hover:bg-amber-500 text-background font-semibold text-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Network className="w-4 h-4" />
              <span>Cadastrar Roteadores</span>
            </button>
          )}
        </div>
      )}

      {/* 1 Router Informational Notice */}
      {routers.length === 1 && (
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 text-primary flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Info className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm text-white">
                Você possui 1 roteador cadastrado ({routers[0].name})
              </div>
              <div className="text-xs text-slate-300">
                Mapeamentos De-Para servem para traduzir e compatibilizar perfis com nomes diferentes entre 2 ou mais roteadores (ex: Sede vs Filial). Com uma única caixa, seus usuários utilizam os perfis nativos diretamente. Adicione um segundo MikroTik para ativar a tradução entre equipamentos.
              </div>
            </div>
          </div>
          {onNavigateToRouters && (
            <button
              onClick={onNavigateToRouters}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition flex items-center space-x-1.5 self-start sm:self-auto shadow-glow-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Segundo MikroTik</span>
            </button>
          )}
        </div>
      )}

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
          onClick={routers.length > 0 ? onOpenCreateGroupMapping : undefined}
          disabled={routers.length === 0}
          title={routers.length === 0 ? 'Cadastre ao menos 1 roteador' : 'Criar novo grupo global'}
          className={`px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center space-x-2 ${
            routers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
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
          {groups.length === 0 ? (
            <div className="p-12 text-center bg-surface-card border border-surface-border rounded-2xl space-y-2">
              <Layers className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="font-semibold text-white text-sm">Nenhum grupo global configurado</div>
              <div className="text-xs text-slate-400">
                Crie um grupo de velocidade para mapear os nomes de perfis correspondentes em cada roteador.
              </div>
            </div>
          ) : (
            groups.map((group) => (
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

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      title="Editar mapeamento deste grupo"
                      onClick={() => onOpenEditGroup(group)}
                      className="p-1.5 rounded-lg bg-surface hover:bg-surface-border text-slate-300 hover:text-primary transition border border-surface-border"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      title="Excluir grupo"
                      onClick={() => {
                        if (confirm(`Excluir grupo "${group.name}"?`)) onDeleteGroup(group.id);
                      }}
                      className="p-1.5 rounded-lg bg-surface hover:bg-accent-rose/20 text-slate-400 hover:text-accent-rose transition border border-surface-border"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
            ))
          )}
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
                  className="p-1.5 rounded-lg bg-surface hover:bg-accent-rose/20 text-slate-400 hover:text-accent-rose transition border border-surface-border"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
