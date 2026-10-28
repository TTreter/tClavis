import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  RefreshCw,
  Zap,
  ShieldAlert,
  ArrowDown,
  ArrowUp,
  Search,
  Clock,
  Download,
  Users,
  HardDrive,
  Activity,
  Layers,
} from 'lucide-react';
import { ActiveSession } from '../../../shared/types';

interface Props {
  onKickSession: (routerId: string, sessionId: string) => Promise<void>;
  onFetchSessions: () => Promise<ActiveSession[]>;
}

export const ActiveSessionsView: React.FC<Props> = ({
  onKickSession,
  onFetchSessions,
}) => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(10); // 0 = off, 5, 10, 30
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const loadSessions = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await onFetchSessions();
      setSessions(data || []);
      setLastRefreshedAt(new Date());
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      loadSessions(true);
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec]);

  const handleKick = async (routerId: string, sessionId: string, user: string) => {
    if (confirm(`Deseja derrubar a conexão de "${user}" agora?`)) {
      setKickingId(sessionId);
      try {
        await onKickSession(routerId, sessionId);
        await loadSessions(true);
      } finally {
        setKickingId(null);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Search filter
  const filteredSessions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.user.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.macAddress.toLowerCase().includes(q) ||
        s.routerName.toLowerCase().includes(q)
    );
  }, [sessions, searchTerm]);

  // Aggregate Metrics
  const totalDownloadBytes = useMemo(
    () => sessions.reduce((acc, s) => acc + (s.bytesOut || 0), 0),
    [sessions]
  );
  const totalUploadBytes = useMemo(
    () => sessions.reduce((acc, s) => acc + (s.bytesIn || 0), 0),
    [sessions]
  );
  const distinctRoutersCount = useMemo(
    () => new Set(sessions.map((s) => s.routerId)).size,
    [sessions]
  );

  const handleExportCsv = () => {
    if (filteredSessions.length === 0) return;
    const headers = 'Usuario,Roteador,IP,MAC,Uptime,DownloadBytes,UploadBytes,Timestamp\n';
    const rows = filteredSessions
      .map(
        (s) =>
          `"${s.user}","${s.routerName}","${s.address}","${s.macAddress}","${s.uptime}","${s.bytesOut}","${s.bytesIn}","${new Date().toISOString()}"`
      )
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `tclavis-sessoes-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Auto-Refresh Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-accent-emerald animate-pulse" />
            <span>Sessões Ativas em Tempo Real</span>
          </h2>
          <p className="text-xs text-slate-400">
            Monitorando clientes navegando no Hotspot de todos os roteadores
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Refresh Select */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface-card border border-surface-border text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Atualização:</span>
            <select
              value={autoRefreshSec}
              onChange={(e) => setAutoRefreshSec(parseInt(e.target.value, 10))}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value={0} className="bg-surface text-white">Manual</option>
              <option value={5} className="bg-surface text-white">A cada 5s</option>
              <option value={10} className="bg-surface text-white">A cada 10s</option>
              <option value={30} className="bg-surface text-white">A cada 30s</option>
            </select>
          </div>

          <button
            onClick={() => loadSessions(false)}
            disabled={loading}
            className="p-2 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-slate-200 text-xs font-medium transition"
            title="Atualizar agora"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          {filteredSessions.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Exportar</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-card border border-surface-border p-3 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center text-accent-emerald">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Clientes Conectados</div>
            <div className="text-lg font-bold text-white">{sessions.length}</div>
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border p-3 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <ArrowDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Volume Download</div>
            <div className="text-lg font-bold text-white font-mono">{formatBytes(totalDownloadBytes)}</div>
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border p-3 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple">
            <ArrowUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Volume Upload</div>
            <div className="text-lg font-bold text-white font-mono">{formatBytes(totalUploadBytes)}</div>
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border p-3 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center text-accent-amber">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Roteadores Ativos</div>
            <div className="text-lg font-bold text-white">{distinctRoutersCount} caixas</div>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filtrar por usuário, IP, MAC address ou roteador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-xl text-white text-xs focus:outline-none focus:border-primary"
        />
      </div>

      {/* Sessions Table */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-surface-border bg-surface/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Usuário</th>
              <th className="py-3 px-4">Roteador Conectado</th>
              <th className="py-3 px-4">Endereço IP</th>
              <th className="py-3 px-4">MAC Address</th>
              <th className="py-3 px-4">Tempo Online</th>
              <th className="py-3 px-4">Download / Upload</th>
              <th className="py-3 px-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-sm font-mono">
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-sans">
                  {loading ? 'Consultando roteadores...' : 'Nenhuma sessão ativa encontrada.'}
                </td>
              </tr>
            ) : (
              filteredSessions.map((s) => (
                <tr key={`${s.routerId}_${s.id}`} className="hover:bg-surface/30 transition">
                  <td className="py-3 px-4 font-semibold text-white">{s.user}</td>
                  <td className="py-3 px-4">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-xs font-sans font-medium">
                      {s.routerName}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-300">{s.address}</td>
                  <td className="py-3 px-4 text-xs text-slate-400">{s.macAddress}</td>
                  <td className="py-3 px-4 text-xs text-accent-emerald">{s.uptime}</td>
                  <td className="py-3 px-4 text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center text-primary font-medium" title="Bytes enviados para o cliente">
                        <ArrowDown className="w-3 h-3 mr-0.5" />
                        {formatBytes(s.bytesOut)}
                      </span>
                      <span className="flex items-center text-accent-purple font-medium" title="Bytes recebidos do cliente">
                        <ArrowUp className="w-3 h-3 mr-0.5" />
                        {formatBytes(s.bytesIn)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleKick(s.routerId, s.id, s.user)}
                      disabled={kickingId === s.id}
                      className="px-2.5 py-1 rounded-lg bg-accent-rose/10 hover:bg-accent-rose/20 text-accent-rose border border-accent-rose/30 text-xs font-sans font-semibold transition flex items-center space-x-1 ml-auto"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Kick</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
