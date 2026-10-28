import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle2, RefreshCw, Wrench, AlertTriangle, ArrowRight, DownloadCloud } from 'lucide-react';
import { AuditReport, ParityDiscrepancy } from '../../../shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRunAudit: () => Promise<AuditReport>;
  onRepair: (discrepancies: ParityDiscrepancy[]) => Promise<number>;
  onRefreshData: () => Promise<void>;
}

export const ParityAuditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onRunAudit,
  onRepair,
  onRefreshData,
}) => {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);

  const executeAudit = async () => {
    setLoading(true);
    try {
      const res = await onRunAudit();
      setReport(res);
    } catch (err: any) {
      alert('Erro ao executar auditoria: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      executeAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRepairAll = async () => {
    if (!report || report.discrepancies.length === 0) return;
    setRepairing(true);
    try {
      const repaired = await onRepair(report.discrepancies);
      alert(`✅ Sucesso! ${repaired} divergência(s) foram corrigidas/importadas.`);
      await onRefreshData();
      await executeAudit();
    } catch (err: any) {
      alert('Erro na reparação: ' + err.message);
    } finally {
      setRepairing(false);
    }
  };

  const handleRepairSingle = async (disc: ParityDiscrepancy) => {
    setRepairing(true);
    try {
      const repaired = await onRepair([disc]);
      await onRefreshData();
      await executeAudit();
    } catch (err: any) {
      alert('Erro ao corrigir divergência: ' + err.message);
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center text-accent-amber">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Auditoria de Paridade (Diff Checker)</h2>
              <p className="text-xs text-slate-400">Varredura e comparação física com os roteadores do cluster</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={executeAudit}
              disabled={loading || repairing}
              className="p-2 rounded-xl bg-surface hover:bg-surface-border border border-surface-border text-slate-300 hover:text-white transition"
              title="Nova Varredura"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm text-slate-300">Consultando o banco físico de cada MikroTik...</p>
            </div>
          ) : report ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-card p-3.5 rounded-xl border border-surface-border">
                  <div className="text-xs text-slate-400">Usuários Locais Auditados</div>
                  <div className="text-xl font-bold text-white mt-1">{report.totalChecked}</div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    report.totalDiscrepancies === 0
                      ? 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald'
                      : 'bg-accent-rose/10 border-accent-rose/30 text-accent-rose'
                  }`}
                >
                  <div className="text-xs">Divergências Encontradas</div>
                  <div className="text-xl font-bold mt-1">
                    {report.totalDiscrepancies === 0 ? '0 (100% Síncronos!)' : report.totalDiscrepancies}
                  </div>
                </div>
              </div>

              {/* Discrepancies List */}
              {report.totalDiscrepancies === 0 ? (
                <div className="p-8 text-center bg-accent-emerald/5 border border-accent-emerald/20 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-accent-emerald mx-auto" />
                  <h3 className="font-bold text-white text-base">Cluster em Perfeita Paridade!</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Todos os usuários, senhas e perfis mapeados no tClavis estão 100% idênticos nos roteadores conectados.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Divergências Detectadas:
                  </div>

                  {report.discrepancies.map((disc) => (
                    <div
                      key={disc.id}
                      className="bg-surface-card border border-surface-border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white font-mono">{disc.username}</span>
                          <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono text-[10px]">
                            {disc.routerName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              disc.type === 'missing_in_router'
                                ? 'bg-accent-rose/15 text-accent-rose'
                                : disc.type === 'profile_mismatch'
                                ? 'bg-accent-amber/15 text-accent-amber'
                                : 'bg-accent-purple/15 text-accent-purple'
                            }`}
                          >
                            {disc.type === 'missing_in_router'
                              ? 'Ausente no Roteador'
                              : disc.type === 'profile_mismatch'
                              ? 'Perfil Divergente'
                              : 'Usuário Órfão (Manual)'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                          <span>Esperado: {disc.expectedValue}</span>
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                          <span className="text-slate-200">Atual: {disc.actualValue}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-slate-400 block mr-2">{disc.suggestedAction}</span>
                        <button
                          type="button"
                          onClick={() => handleRepairSingle(disc)}
                          disabled={repairing}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                            disc.type === 'orphan_in_router'
                              ? 'bg-primary hover:bg-primary-hover text-background shadow-glow-primary'
                              : 'bg-surface hover:bg-surface-border border border-surface-border text-white'
                          }`}
                        >
                          {disc.type === 'orphan_in_router' ? (
                            <>
                              <DownloadCloud className="w-3.5 h-3.5" />
                              <span>Importar</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Corrigir</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        {report && report.totalDiscrepancies > 0 && (
          <div className="px-6 py-4 border-t border-surface-border bg-surface-card flex items-center justify-between">
            <span className="text-xs text-slate-400">
              O tClavis reaplicará as regras De-Para nos roteadores descompassados.
            </span>
            <button
              onClick={handleRepairAll}
              disabled={repairing}
              className="px-5 py-2 rounded-xl bg-accent-emerald hover:bg-emerald-600 text-white font-semibold text-xs transition shadow-lg flex items-center space-x-2"
            >
              {repairing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wrench className="w-3.5 h-3.5" />
              )}
              <span>Corrigir Todas as Divergências</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
