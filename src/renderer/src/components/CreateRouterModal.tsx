import React, { useState } from 'react';
import { X, Network, ShieldCheck, Activity, CheckCircle, AlertTriangle, Radio, RefreshCw, Sparkles } from 'lucide-react';
import { RouterDevice, DiscoveredNeighbor } from '../../../shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (router: RouterDevice) => Promise<void>;
  onTest: (router: RouterDevice) => Promise<any>;
}

export const CreateRouterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onTest,
}) => {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('8728');
  const [useSsl, setUseSsl] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latency?: number; version?: string; error?: string } | null>(null);
  const [scanningMndp, setScanningMndp] = useState(false);
  const [discoveredNeighbors, setDiscoveredNeighbors] = useState<DiscoveredNeighbor[]>([]);

  if (!isOpen) return null;

  const handleScanMndp = async () => {
    if (!window.tclavisAPI?.discoverRoutersMndp) return;
    setScanningMndp(true);
    setDiscoveredNeighbors([]);
    try {
      const list = await window.tclavisAPI.discoverRoutersMndp();
      setDiscoveredNeighbors(list);
    } catch (_) {
    } finally {
      setScanningMndp(false);
    }
  };

  const handleSelectNeighbor = (neighbor: DiscoveredNeighbor) => {
    setName(`${neighbor.identity} (${neighbor.board})`);
    setHost(neighbor.ip);
    if (neighbor.version) {
      setTestResult({
        success: true,
        version: neighbor.version,
        latency: 1,
      });
    }
  };

  const handleTestConnection = async () => {
    if (!host || !username) {
      alert('Preencha o IP/Host e o Usuário para testar.');
      return;
    }
    setTesting(true);
    setTestResult(null);

    const tempRouter: RouterDevice = {
      id: 'temp',
      name: name || 'Teste',
      host: host.trim(),
      port: parseInt(port, 10) || 8728,
      useSsl,
      username: username.trim(),
      passwordEncrypted: password,
      status: 'offline',
    };

    try {
      const result = await onTest(tempRouter);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !host.trim() || !username.trim()) return;

    const newRouter: RouterDevice = {
      id: `mk_${Date.now()}`,
      name: name.trim(),
      host: host.trim(),
      port: parseInt(port, 10) || (useSsl ? 8729 : 8728),
      useSsl,
      username: username.trim(),
      passwordEncrypted: password,
      status: testResult?.success ? 'online' : 'offline',
      routerOsVersion: testResult?.version,
      latencyMs: testResult?.latency,
    };

    await onSave(newRouter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Adicionar MikroTik</h2>
              <p className="text-xs text-slate-400">RouterOS API (TCP 8728 / SSL 8729)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MNDP Discovery Action */}
        <div className="px-6 pt-4 pb-0">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-white block">Localizar MikroTik na Rede Local</span>
              <span className="text-[11px] text-slate-400">Escaneia a LAN via MNDP (UDP 5678)</span>
            </div>
            <button
              type="button"
              onClick={handleScanMndp}
              disabled={scanningMndp}
              className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-semibold transition flex items-center space-x-1.5"
            >
              <Radio className={`w-3.5 h-3.5 ${scanningMndp ? 'animate-pulse text-accent-emerald' : ''}`} />
              <span>{scanningMndp ? 'Buscando...' : 'Escanear LAN'}</span>
            </button>
          </div>

          {discoveredNeighbors.length > 0 && (
            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                MikroTiks Detectados (Clique para Preencher):
              </div>
              {discoveredNeighbors.map((nb, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectNeighbor(nb)}
                  className="p-2 bg-surface-card hover:bg-primary/10 border border-surface-border hover:border-primary/40 rounded-lg cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{nb.identity}</span>
                    <span className="text-slate-400 text-[11px] ml-1.5 font-mono">({nb.board})</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-primary font-semibold">{nb.ip}</span>
                    <span className="text-[10px] text-slate-500 ml-2">{nb.version}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nome de Identificação *</label>
            <input
              type="text"
              required
              placeholder="ex: MikroTik 1 (Sede) ou Filial Leste"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">IP / Host do MikroTik *</label>
              <input
                type="text"
                required
                placeholder="192.168.88.1 ou vpn.empresa.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Porta API</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="space-y-1 py-1">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useSsl"
                checked={useSsl}
                onChange={(e) => {
                  setUseSsl(e.target.checked);
                  if (e.target.checked && port === '8728') setPort('8729');
                  if (!e.target.checked && port === '8729') setPort('8728');
                }}
                className="rounded bg-surface-card border-surface-border text-primary focus:ring-0"
              />
              <label htmlFor="useSsl" className="text-xs text-slate-300 cursor-pointer flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-accent-purple" />
                <span>Conectar com SSL/TLS (Criptografado)</span>
              </label>
            </div>
            {useSsl && (
              <p className="text-[11px] text-slate-400 pl-5">
                Aceita certificados autoassinados RouterOS. Para links remotos via WAN, utilize WireGuard ou VPN segura.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Usuário RouterOS *</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Senha</label>
              <input
                type="password"
                placeholder="Senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          {/* Test connection feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center space-x-2.5 ${
                testResult.success
                  ? 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald'
                  : 'bg-accent-rose/10 border-accent-rose/30 text-accent-rose'
              }`}
            >
              {testResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              <div>
                {testResult.success ? (
                  <span>
                    Conectado com sucesso! {testResult.version} • Latência: {testResult.latency}ms
                  </span>
                ) : (
                  <span>Falha: {testResult.error}</span>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-surface-border">
            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              className="px-3.5 py-2 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-slate-200 text-xs font-medium transition flex items-center space-x-1.5"
            >
              <Activity className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-primary' : 'text-slate-400'}`} />
              <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-surface-card transition text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary"
              >
                Salvar Roteador
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
