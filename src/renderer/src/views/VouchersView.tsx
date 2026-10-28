import React, { useState } from 'react';
import QRCode from 'qrcode';
import {
  Ticket,
  Printer,
  RefreshCw,
  QrCode,
  Download,
  AlertTriangle,
  Building2,
  Wifi,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { LogicalGroup, LogicalServer, HotspotUser, RouterDevice } from '../../../shared/types';

interface GeneratedVoucher {
  user: string;
  pass: string;
  qrDataUrl: string;
}

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

  // Customization & Branding
  const [companyName, setCompanyName] = useState('REDE WI-FI VISITANTES');
  const [ssidName, setSsidName] = useState('Wi-Fi_Visitantes');
  const [hotspotHost, setHotspotHost] = useState(routers[0]?.host || '192.168.88.1');
  const [qrMode, setQrMode] = useState<'login_url' | 'wifi_connect'>('login_url');
  const [printLayout, setPrintLayout] = useState<'thermal_58' | 'thermal_80' | 'a4_grid'>('thermal_80');

  const [generatedVouchers, setGeneratedVouchers] = useState<GeneratedVoucher[]>([]);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(quantity, 10);
    const len = parseInt(codeLength, 10);
    if (isNaN(count) || count <= 0) return;

    setGenerating(true);
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const vouchers: GeneratedVoucher[] = [];
    const usersToCreate: HotspotUser[] = [];

    const selectedGroup = groups.find((g) => g.id === selectedGroupId);
    const selectedServer = servers.find((s) => s.id === selectedServerId);

    try {
      for (let i = 0; i < count; i++) {
        let randomCode = '';
        for (let j = 0; j < len; j++) {
          randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const username = `${prefix}${randomCode}`;
        const password = Math.floor(1000 + Math.random() * 9000).toString();

        // Generate Real QR Code
        let qrPayload = '';
        if (qrMode === 'login_url') {
          qrPayload = `http://${hotspotHost}/login?username=${username}&password=${password}`;
        } else {
          qrPayload = `WIFI:T:WPA;S:${ssidName};P:${password};;`;
        }

        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
          margin: 1,
          width: 140,
          errorCorrectionLevel: 'M',
        });

        vouchers.push({ user: username, pass: password, qrDataUrl });

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

      await onBatchCreateUsers(usersToCreate);
      setGeneratedVouchers(vouchers);
    } catch (err: any) {
      alert('Erro ao gerar vouchers: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (generatedVouchers.length === 0) return;
    const headers = 'Usuario,Senha,Validade,Perfil,SSID,DataCriacao\n';
    const rows = generatedVouchers
      .map(
        (v) =>
          `"${v.user}","${v.pass}","${uptimeLimit}","${groups.find((g) => g.id === selectedGroupId)?.name || 'Default'}","${ssidName}","${new Date().toISOString()}"`
      )
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `tclavis-vouchers-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Ticket className="w-5 h-5 text-primary" />
            <span>Gerador de Vouchers & Ingressos Hotspot</span>
          </h2>
          <p className="text-xs text-slate-400">
            Emissão em lote de tíquetes com QR Code real, sincronizados em todos os roteadores
          </p>
        </div>

        {generatedVouchers.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5 shadow"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-accent-emerald hover:bg-emerald-600 text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir ({generatedVouchers.length})</span>
            </button>
          </div>
        )}
      </div>

      {routers.length === 0 && (
        <div className="p-4 rounded-2xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber flex items-center space-x-3 no-print">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-xs">
            <strong>Nenhum roteador conectado:</strong> Cadastre ao menos um MikroTik antes de gerar e sincronizar lotes de vouchers.
          </div>
        </div>
      )}

      {/* Generator Form */}
      <form
        onSubmit={handleGenerate}
        className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-xl space-y-4 no-print"
      >
        <div className="flex items-center space-x-2 text-xs font-bold text-primary uppercase tracking-wider pb-1 border-b border-surface-border">
          <Sparkles className="w-4 h-4" />
          <span>Configuração do Lote de Acesso</span>
        </div>

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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tempo de Validade (Uptime)</label>
            <input
              type="text"
              value={uptimeLimit}
              placeholder="Ex: 2h, 4h, 1d"
              onChange={(e) => setUptimeLimit(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        {/* Branding & Printing Format Controls */}
        <div className="pt-2 border-t border-surface-border grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Nome no Cabeçalho</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-xl text-white text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <Wifi className="w-3.5 h-3.5 text-accent-emerald" />
              <span>Nome da Rede Wi-Fi (SSID)</span>
            </label>
            <input
              type="text"
              value={ssidName}
              onChange={(e) => setSsidName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-xl text-white text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <QrCode className="w-3.5 h-3.5 text-accent-purple" />
              <span>Ação do QR Code</span>
            </label>
            <select
              value={qrMode}
              onChange={(e) => setQrMode(e.target.value as any)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-xl text-white text-xs focus:outline-none focus:border-primary"
            >
              <option value="login_url">URL Captive (Auto-login)</option>
              <option value="wifi_connect">Conectar no Wi-Fi</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <Printer className="w-3.5 h-3.5 text-accent-amber" />
              <span>Formato de Impressão</span>
            </label>
            <select
              value={printLayout}
              onChange={(e) => setPrintLayout(e.target.value as any)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-xl text-white text-xs focus:outline-none focus:border-primary font-medium"
            >
              <option value="thermal_80">Bobina Térmica 80mm (ESC/POS)</option>
              <option value="thermal_58">Bobina Térmica 58mm (Mini POS)</option>
              <option value="a4_grid">Grade Folha A4 (Cartões)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={generating || routers.length === 0}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>Gerar & Sincronizar Vouchers com QR Code</span>
          </button>
        </div>
      </form>

      {/* Printable Vouchers View */}
      {generatedVouchers.length > 0 && (
        <div className="space-y-3 printable-container">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between no-print">
            <span>
              Prévia de Impressão ({printLayout === 'thermal_80' ? '80mm' : printLayout === 'thermal_58' ? '58mm' : 'Grade A4'}):
            </span>
            <span className="text-[11px] text-accent-emerald flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{generatedVouchers.length} Vouchers Gerados & Prontos para Impressão</span>
            </span>
          </div>

          {/* Thermal 58mm Layout */}
          {printLayout === 'thermal_58' && (
            <div className="flex flex-col items-center gap-3 w-full">
              {generatedVouchers.map((v, idx) => (
                <div
                  key={idx}
                  style={{ width: '54mm', maxWidth: '100%' }}
                  className="bg-white text-slate-900 border-2 border-dashed border-slate-400 p-2 text-center font-mono rounded shadow-sm break-inside-avoid my-1"
                >
                  <div className="font-extrabold text-[12px] uppercase tracking-tight">{companyName}</div>
                  <div className="text-[10px] text-slate-600 border-b border-dashed border-slate-300 pb-1 mb-1">
                    Wi-Fi: <strong>{ssidName}</strong>
                  </div>

                  <div className="my-1.5 flex justify-center">
                    <img src={v.qrDataUrl} alt="QR Code" className="w-20 h-20 object-contain mx-auto" />
                  </div>

                  <div className="text-[10px] text-slate-600">Aponte a câmera para conectar</div>

                  <div className="bg-slate-100 p-1.5 rounded my-1 border border-slate-200 text-left text-[11px]">
                    <div>
                      <span className="text-slate-500 text-[9px] block">USUÁRIO:</span>
                      <strong className="text-sm font-bold text-black">{v.user}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] block">SENHA:</span>
                      <strong className="text-sm font-bold text-black">{v.pass}</strong>
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-500 flex justify-between pt-1 border-t border-dashed border-slate-300">
                    <span>Validade: {uptimeLimit}</span>
                    <span>tClavis Sync</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Thermal 80mm Layout */}
          {printLayout === 'thermal_80' && (
            <div className="flex flex-col items-center gap-3 w-full">
              {generatedVouchers.map((v, idx) => (
                <div
                  key={idx}
                  style={{ width: '74mm', maxWidth: '100%' }}
                  className="bg-white text-slate-900 border-2 border-dashed border-slate-400 p-3 text-center font-mono rounded-lg shadow-sm break-inside-avoid my-1"
                >
                  <div className="font-extrabold text-[14px] uppercase tracking-tight border-b-2 border-slate-300 pb-1">
                    {companyName}
                  </div>
                  <div className="text-[11px] text-slate-700 py-1">
                    Rede Wi-Fi: <strong>{ssidName}</strong>
                  </div>

                  <div className="my-2 flex items-center justify-around bg-slate-50 p-2 rounded border border-slate-200">
                    <img src={v.qrDataUrl} alt="QR Code" className="w-24 h-24 object-contain" />
                    <div className="text-left pl-2">
                      <div className="text-[10px] text-slate-500 uppercase">Login Fácil:</div>
                      <div className="text-[11px] text-slate-700 font-sans">
                        Escaneie o QR Code com a câmera do celular para acesso instantâneo.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded border border-slate-200 text-left">
                    <div>
                      <span className="text-slate-500 text-[10px] block">USUÁRIO:</span>
                      <strong className="text-base font-extrabold text-black">{v.user}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">SENHA:</span>
                      <strong className="text-base font-extrabold text-black">{v.pass}</strong>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 flex justify-between pt-2 mt-2 border-t border-dashed border-slate-300">
                    <span>Validade de Acesso: {uptimeLimit}</span>
                    <span>tClavis Hotspot</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* A4 Grid Layout */}
          {printLayout === 'a4_grid' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {generatedVouchers.map((v, idx) => (
                <div
                  key={idx}
                  className="bg-white text-slate-900 border-2 border-dashed border-slate-300 rounded-xl p-3 shadow-md flex flex-col justify-between break-inside-avoid font-mono"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
                      <span className="font-extrabold text-xs tracking-wider text-primary truncate max-w-[140px]">
                        {companyName}
                      </span>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">
                        {uptimeLimit}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 my-2">
                      <img src={v.qrDataUrl} alt="QR Code" className="w-16 h-16 object-contain flex-shrink-0" />
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-slate-500 text-[9px] block">USUÁRIO:</span>
                          <strong className="text-xs text-slate-900">{v.user}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[9px] block">SENHA:</span>
                          <strong className="text-xs text-slate-900">{v.pass}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-200 text-[9px] text-slate-500 flex justify-between items-center">
                    <span>Wi-Fi: {ssidName}</span>
                    <span className="text-[8px] bg-primary/10 text-primary px-1 rounded">tClavis Sync</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
