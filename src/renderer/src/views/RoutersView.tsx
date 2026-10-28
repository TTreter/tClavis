import React, { useState } from 'react';
import { Plus, Network, RefreshCw, Activity, Trash2, ShieldCheck, CheckCircle2, AlertTriangle, DownloadCloud } from 'lucide-react';
import { RouterDevice } from '../../../shared/types';

interface Props {
  routers: RouterDevice[];
  onOpenCreate: () => void;
  onDeleteRouter: (id: string) => Promise<void>;
  onTestRouter: (router: RouterDevice) => Promise<any>;
  onOpenImportRouter?: (routerId: string) => void;
}

export const RoutersView: React.FC<Props> = ({
  routers,
  onOpenCreate,
  onDeleteRouter,
  onTestRouter,
  onOpenImportRouter,
}) => {
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = async (router: RouterDevice) => {
    setTestingId(router.id);
    try {
      await onTestRouter(router);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Roteadores MikroTik</h2>
          <p className="text-xs text-slate-400">
            Gerencie e monitore as caixas conectadas via RouterOS API
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar MikroTik</span>
        </button>
      </div>

      {routers.length === 0 ? (
        <div className="p-16 text-center bg-surface-card border border-surface-border rounded-2xl space-y-3">
          <Network className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-white text-base">Nenhum roteador cadastrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Cadastre seu primeiro MikroTik RouterOS informando o IP, porta da API e credenciais de acesso.
          </p>
          <button
            onClick={onOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition shadow-glow-primary inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar MikroTik Agora</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routers.map((router) => {
            const isTesting = testingId === router.id;
            return (
              <div
                key={router.id}
                className="bg-surface-card border border-surface-border rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Network className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{router.name}</h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${
                            router.status === 'online'
                              ? 'bg-accent-emerald/15 text-accent-emerald'
                              : 'bg-accent-rose/15 text-accent-rose'
                          }`}
                        >
                          {router.status === 'online' ? '🟢 Online' : '🔴 Desconectado'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Remover roteador "${router.name}"?`)) onDeleteRouter(router.id);
                      }}
                      className="text-slate-500 hover:text-accent-rose transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-background/40 rounded-xl p-3 border border-surface-border/60 text-xs font-mono space-y-1 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Endereço:</span>
                      <span>{router.host}:{router.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Usuário API:</span>
                      <span>{router.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Versão:</span>
                      <span className="text-primary">{router.routerOsVersion || 'RouterOS'}</span>
                    </div>
                    {router.latencyMs !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Latência:</span>
                        <span className="text-accent-emerald">{router.latencyMs} ms</span>
                      </div>
                    )}
                  </div>

                  {router.lastError && (
                    <div className="p-2.5 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-accent-rose text-[11px] flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{router.lastError}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {router.uptime ? `Uptime: ${router.uptime}` : 'Não verificado'}
                  </span>

                  <div className="flex items-center space-x-2">
                    {onOpenImportRouter && (
                      <button
                        type="button"
                        onClick={() => onOpenImportRouter(router.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-border border border-surface-border text-xs text-slate-200 transition flex items-center space-x-1.5"
                        title="Importar usuários salvos neste MikroTik"
                      >
                        <DownloadCloud className="w-3 h-3 text-primary" />
                        <span>Importar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isTesting}
                      onClick={() => handleTest(router)}
                      className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-border border border-surface-border text-xs text-slate-200 transition flex items-center space-x-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-primary' : ''}`} />
                      <span>{isTesting ? 'Checando...' : 'Testar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
