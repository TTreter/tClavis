import React, { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  Clock,
  Search,
  CheckSquare,
  Square,
  ShieldAlert,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { HotspotUser } from '../../../shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPurged: (count: number) => void;
}

export const VoucherPurgeModal: React.FC<Props> = ({ isOpen, onClose, onPurged }) => {
  const [olderThanDays, setOlderThanDays] = useState<number>(30);
  const [filterType, setFilterType] = useState<'unused' | 'expired' | 'all'>('unused');
  const [foundVouchers, setFoundVouchers] = useState<HotspotUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);
    try {
      if (window.tclavisAPI?.findPurgeableVouchers) {
        const results = await window.tclavisAPI.findPurgeableVouchers({
          olderThanDays,
          unusedOnly: filterType === 'unused',
          expiredOnly: filterType === 'expired',
        });
        setFoundVouchers(results || []);
        setSelectedIds(new Set((results || []).map((u: HotspotUser) => u.id)));
        setHasSearched(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar vouchers.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === foundVouchers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(foundVouchers.map((u) => u.id)));
    }
  };

  const handleConfirmPurge = async () => {
    if (selectedIds.size === 0) return;

    if (
      !window.confirm(
        `Atenção: Você está prestes a apagar ${selectedIds.size} vouchers do banco de dados e de todos os roteadores MikroTik sincronizados.\n\nDeseja continuar?`
      )
    ) {
      return;
    }

    setIsPurging(true);
    setError(null);
    try {
      if (window.tclavisAPI?.purgeVouchers) {
        const count = await window.tclavisAPI.purgeVouchers(Array.from(selectedIds));
        onPurged(count);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao executar o expurgo de vouchers.');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface border border-surface-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Expurgo de Vouchers Obsoletos
              </h2>
              <p className="text-xs text-slate-400">
                Remova vouchers antigos ou esgotados para liberar memória nos MikroTiks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Body */}
        <div className="p-6 border-b border-surface-border bg-surface/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Critério de Filtragem
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary transition-colors"
              >
                <option value="unused">Nunca Utilizados (Uptime = 0s)</option>
                <option value="expired">Tempo de Validade Esgotado</option>
                <option value="all">Todos os Vouchers Antigos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Criados há mais de
              </label>
              <select
                value={olderThanDays}
                onChange={(e) => setOlderThanDays(Number(e.target.value))}
                className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary transition-colors"
              >
                <option value={7}>7 dias</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias (Recomendado)</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
                <option value={0}>Qualquer data (Todos os correspondentes)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-accent-amber" />
              Os vouchers selecionados serão apagados do tClavis e de cada roteador.
            </span>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {isSearching ? 'Localizando...' : 'Localizar Vouchers'}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-accent-red/10 border border-accent-red/20 rounded-xl text-xs text-accent-red flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[220px]">
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
              <Search className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhuma busca realizada</p>
              <p className="text-xs mt-1">
                Configure os filtros acima e clique em &quot;Localizar Vouchers&quot; para visualizar a lista.
              </p>
            </div>
          ) : foundVouchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mb-2 text-accent-emerald/50" />
              <p className="text-sm font-semibold text-white">Nenhum voucher obsoleto encontrado</p>
              <p className="text-xs mt-1 text-slate-400">
                Seu banco e roteadores estão limpos de acordo com os critérios selecionados.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-surface-border text-xs text-slate-400">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 font-medium hover:text-white transition-colors"
                >
                  {selectedIds.size === foundVouchers.length ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Selecionar todos ({foundVouchers.length} encontrados)
                </button>
                <span className="font-semibold text-slate-300">
                  {selectedIds.size} selecionado(s) para expurgo
                </span>
              </div>

              <div className="border border-surface-border rounded-xl overflow-hidden divide-y divide-surface-border">
                {foundVouchers.map((user) => {
                  const isChecked = selectedIds.has(user.id);
                  const createdDate = user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                    : 'N/D';

                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleSelect(user.id)}
                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                        isChecked ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(user.id);
                          }}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <div className="font-mono font-medium text-slate-200">
                            {user.username}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>Grupo: {user.logicalGroupId || 'Padrão'}</span>
                            <span>•</span>
                            <span>Criado: {createdDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-2 py-0.5 text-xs font-mono rounded bg-surface-card border border-surface-border text-slate-300">
                          {user.uptimeLimit ? `Limite: ${user.uptimeLimit}` : 'Sem limite de tempo'}
                        </span>
                        {user.comment && (
                          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">
                            {user.comment}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border bg-surface-card">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmPurge}
            disabled={selectedIds.size === 0 || isPurging}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-red hover:bg-accent-red/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-red/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {isPurging
              ? 'Expurgando vouchers...'
              : `Confirmar Expurgo (${selectedIds.size} vouchers)`}
          </button>
        </div>
      </div>
    </div>
  );
};
