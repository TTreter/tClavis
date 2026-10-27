import React, { useState } from 'react';
import { Ticket, Printer, RefreshCw, QrCode, Layers, ShieldCheck } from 'lucide-react';
import { LogicalGroup, LogicalServer, HotspotUser, RouterDevice } from '../../../shared/types';

interface Props {
  groups: LogicalGroup[];
  servers: LogicalServer[];
  routers: RouterDevice[];
  onBatchCreateUsers: (users: HotspotUser[]) => Promise<void>;
}

export const VouchersView: React.FC<Props> = ({
  groups,
  servers,
  routers,
  onBatchCreateUsers,
}) => {
  const [quantity, setQuantity] = useState('10');
  const [prefix, setPrefix] = useState('HOT-');
  const [codeLength, setCodeLength] = useState('5');
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [selectedServerId, setSelectedServerId] = useState(servers[0]?.id || '');
  const [uptimeLimit, setUptimeLimit] = useState('4h');
  const [generatedVouchers, setGeneratedVouchers] = useState<{ user: string; pass: string }[]>([]);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(quantity, 10);
    const len = parseInt(codeLength, 10);
    if (isNaN(count) || count <= 0) return;

    setGenerating(true);
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const vouchers: { user: string; pass: string }[] = [];
    const usersToCreate: HotspotUser[] = [];

    const selectedGroup = groups.find((g) => g.id === selectedGroupId);
    const selectedServer = servers.find((s) => s.id === selectedServerId);

    for (let i = 0; i < count; i++) {
      let randomCode = '';
      for (let j = 0; j < len; j++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const username = `${prefix}${randomCode}`;
      const password = Math.floor(1000 + Math.random() * 9000).toString();

      vouchers.push({ user: username, pass: password });

      const syncStatus: HotspotUser['syncStatus'] = {};
      for (const r of routers) {
        syncStatus[r.id] = {
          status: 'pending',
          remoteProfile: selectedGroup?.routerMappings[r.id] || 'default',
          remoteServer: selectedServer?.routerMappings[r.id] || 'all',
        };
      }

      usersToCreate.push({
        id: `vch_${Date.now()}_${i}`,
        username,
        password,
        logicalGroupId: selectedGroupId,
        logicalServerId: selectedServerId || undefined,
        uptimeLimit,
        comment: `Voucher Lote (${uptimeLimit})`,
        disabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus,
      });
    }

    try {
      await onBatchCreateUsers(usersToCreate);
      setGeneratedVouchers(vouchers);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Ticket className="w-5 h-5 text-primary" />
            <span>Gerador de Vouchers & Ingressos de Acesso</span>
          </h2>
          <p className="text-xs text-slate-400">
            Crie lotes de acessos temporários sincronizados em todos os roteadores do cluster
          </p>
        </div>

        {generatedVouchers.length > 0 && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-accent-emerald hover:bg-emerald-600 text-white font-semibold text-sm transition flex items-center space-x-2 shadow-lg"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Vouchers ({generatedVouchers.length})</span>
          </button>
        )}
      </div>

      {/* Generator Form */}
      <form onSubmit={handleGenerate} className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Quantidade de Vouchers</label>
            <input
              type="number"
              min="1"
              max="200"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Prefixo do Código</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Grupo Lógico (Perfil)</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Validade / Uptime</label>
            <input
              type="text"
              value={uptimeLimit}
              onChange={(e) => setUptimeLimit(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={generating}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center space-x-2"
          >
            {generating && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>Gerar & Sincronizar Vouchers</span>
          </button>
        </div>
      </form>

      {/* Printable Vouchers Grid */}
      {generatedVouchers.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Vouchers Gerados (Visualização de Impressão):
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {generatedVouchers.map((v, idx) => (
              <div
                key={idx}
                className="bg-white text-slate-900 border-2 border-dashed border-slate-300 rounded-xl p-3 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
                    <span className="font-extrabold text-xs tracking-wider text-primary">tCLAVIS WI-FI</span>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">{uptimeLimit}</span>
                  </div>

                  <div className="space-y-1 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">USUÁRIO:</span>
                      <strong className="text-sm text-slate-900">{v.user}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">SENHA:</span>
                      <strong className="text-sm text-slate-900">{v.pass}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 text-[9px] text-slate-500 text-center flex items-center justify-center space-x-1">
                  <QrCode className="w-3.5 h-3.5 text-slate-700" />
                  <span>Acesse o Wi-Fi e digite o login</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
