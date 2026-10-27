import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw, Zap, ShieldAlert, ArrowDown, ArrowUp } from 'lucide-react';
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

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await onFetchSessions();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleKick = async (routerId: string, sessionId: string, user: string) => {
    if (confirm(`Deseja derrubar a conexão de "${user}" agora?`)) {
      setKickingId(sessionId);
      try {
        await onKickSession(routerId, sessionId);
        await loadSessions();
      } finally {
        setKickingId(null);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-accent-emerald animate-pulse" />
            <span>Sessões Ativas em Tempo Real</span>
          </h2>
          <p className="text-xs text-slate-400">
            Monitorando clientes navegando no Hotspot de todos os roteadores
          </p>
        </div>

        <button
          onClick={loadSessions}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-slate-200 text-sm font-medium transition flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Atualizar Sessões</span>
        </button>
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
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-sans">
                  {loading ? 'Consultando roteadores...' : 'Nenhuma sessão ativa no momento.'}
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={`${s.routerId}_${s.id}`} className="hover:bg-surface/30 transition">
                  <td className="py-3 px-4 font-semibold text-white">{s.user}</td>
                  <td className="py-3 px-4">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-xs">
                      {s.routerName}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-300">{s.address}</td>
                  <td className="py-3 px-4 text-xs text-slate-400">{s.macAddress}</td>
                  <td className="py-3 px-4 text-xs text-accent-emerald">{s.uptime}</td>
                  <td className="py-3 px-4 text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center text-primary">
                        <ArrowDown className="w-3 h-3 mr-0.5" />
                        {formatBytes(s.bytesOut)}
                      </span>
                      <span className="flex items-center text-accent-purple">
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
