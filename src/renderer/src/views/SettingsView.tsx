import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Lock,
  Clock,
  Monitor,
  Flame,
  DownloadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Check,
  Sparkles,
} from 'lucide-react';
import { SystemAuditLog } from '../../../shared/types';

interface Props {
  onOpenPurgeModal: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  requireAuth: (action: () => void) => void;
}

export const SettingsView: React.FC<Props> = ({
  onOpenPurgeModal,
  onShowToast,
  requireAuth,
}) => {
  const [activeTab, setActiveTab] = useState<
    'security' | 'system' | 'purge' | 'updater' | 'logs'
  >('security');

  // Security Form State
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinTimeoutMinutes, setPinTimeoutMinutes] = useState(5);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  // System Form State
  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [systemLoading, setSystemLoading] = useState(false);

  // Updater State
  const [currentVersion, setCurrentVersion] = useState('2.0.0');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    percentage: number;
    transferredBytes: number;
    totalBytes: number;
    speedBytesPerSec: number;
  } | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Logs State
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    loadSettings();
    loadVersion();
    setupUpdateListener();
  }, []);

  const loadSettings = async () => {
    try {
      if (window.tclavisAPI?.getSettings) {
        const settings = await window.tclavisAPI.getSettings();
        if (settings.open_at_login !== undefined) {
          setOpenAtLogin(settings.open_at_login === 'true');
        }
        if (settings.minimize_to_tray !== undefined) {
          setMinimizeToTray(settings.minimize_to_tray === 'true');
        }
        if (settings.pin_timeout_minutes) {
          setPinTimeoutMinutes(Number(settings.pin_timeout_minutes) || 5);
        }
      }
    } catch (err) {
      console.error('Falha ao carregar configurações:', err);
    }
  };

  const loadVersion = async () => {
    try {
      if (window.tclavisAPI?.getCurrentVersion) {
        const v = await window.tclavisAPI.getCurrentVersion();
        if (v) setCurrentVersion(v);
      }
    } catch (err) {
      console.error('Falha ao obter versão atual:', err);
    }
  };

  const setupUpdateListener = () => {
    if (window.tclavisAPI?.onUpdateProgress) {
      const unsub = window.tclavisAPI.onUpdateProgress((progress: any) => {
        setDownloadProgress(progress);
        if (progress.percentage >= 100) {
          setIsDownloading(false);
          setIsDownloaded(true);
        }
      });
      return unsub;
    }
  };

  // Change PIN Submit
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(false);

    if (!oldPin) {
      setPinError('Informe seu PIN atual.');
      return;
    }

    if (newPin.length < 4 || newPin.length > 8) {
      setPinError('O novo PIN deve conter entre 4 e 8 dígitos.');
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setPinError('O novo PIN deve conter apenas números.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('A confirmação do novo PIN não coincide.');
      return;
    }

    setPinLoading(true);
    try {
      if (window.tclavisAPI?.changeMasterPin) {
        const success = await window.tclavisAPI.changeMasterPin(oldPin, newPin);
        if (success) {
          setPinSuccess(true);
          setOldPin('');
          setNewPin('');
          setConfirmPin('');
          onShowToast('PIN mestre alterado com sucesso!', 'success');
        } else {
          setPinError('PIN atual incorreto. Verifique e tente novamente.');
        }
      }
    } catch (err: any) {
      setPinError(err.message || 'Falha ao alterar PIN.');
    } finally {
      setPinLoading(false);
    }
  };

  // Save Session Timeout Setting
  const handleTimeoutChange = async (minutes: number) => {
    setPinTimeoutMinutes(minutes);
    try {
      if (window.tclavisAPI?.saveSettings) {
        await window.tclavisAPI.saveSettings({
          pin_timeout_minutes: String(minutes),
        });
        onShowToast(`Tempo de sessão atualizado para ${minutes === 0 ? 'sempre pedir' : minutes + ' min'}.`, 'success');
      }
    } catch (err) {
      console.error('Erro ao salvar timeout:', err);
    }
  };

  // Save System Settings
  const handleSaveSystem = async () => {
    setSystemLoading(true);
    try {
      if (window.tclavisAPI?.saveSettings) {
        await window.tclavisAPI.saveSettings({
          open_at_login: String(openAtLogin),
          minimize_to_tray: String(minimizeToTray),
        });
        onShowToast('Configurações do sistema salvas com sucesso!', 'success');
      }
    } catch (err: any) {
      onShowToast(`Erro ao salvar: ${err.message}`, 'error');
    } finally {
      setSystemLoading(false);
    }
  };

  // Check For Updates
  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateError(null);
    try {
      if (window.tclavisAPI?.checkForUpdates) {
        const res = await window.tclavisAPI.checkForUpdates();
        setUpdateInfo(res);
        if (res.hasUpdate) {
          onShowToast(`Nova versão ${res.latestVersion} disponível!`, 'info');
        } else {
          onShowToast('Seu tClavis já está na versão mais recente.', 'success');
        }
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Erro ao consultar atualizações.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Download Update
  const handleDownloadUpdate = async () => {
    if (!updateInfo?.downloadUrl) {
      setUpdateError('URL de download do instalador não encontrada no release.');
      return;
    }

    setIsDownloading(true);
    setIsDownloaded(false);
    setUpdateError(null);

    try {
      if (window.tclavisAPI?.downloadUpdate) {
        const res = await window.tclavisAPI.downloadUpdate({
          downloadUrl: updateInfo.downloadUrl,
          assetName: updateInfo.assetName || `tClavis-Setup-${updateInfo.latestVersion}.exe`,
        });

        if (res.success) {
          setIsDownloaded(true);
          onShowToast('Download concluído! Pronto para instalar.', 'success');
        } else {
          setUpdateError(res.error || 'Falha ao baixar atualização.');
        }
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Erro durante o download.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Install Update
  const handleInstallUpdate = async () => {
    if (
      window.confirm(
        'O aplicativo será encerrado para iniciar a instalação da nova versão. Deseja prosseguir agora?'
      )
    ) {
      try {
        if (window.tclavisAPI?.installUpdate) {
          await window.tclavisAPI.installUpdate();
        }
      } catch (err: any) {
        setUpdateError(err.message || 'Erro ao executar instalador.');
      }
    }
  };

  // Load Logs
  const handleLoadLogs = async () => {
    setLogsLoading(true);
    try {
      if (window.tclavisAPI?.getLogs) {
        const list = await window.tclavisAPI.getLogs(100);
        setLogs(list || []);
      }
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    requireAuth(async () => {
      if (window.confirm('Deseja realmente limpar todos os logs de auditoria do sistema?')) {
        if (window.tclavisAPI?.clearLogs) {
          await window.tclavisAPI.clearLogs();
          setLogs([]);
          onShowToast('Logs de auditoria limpos com sucesso.', 'info');
        }
      }
    });
  };

  const handleClearDemo = async () => {
    requireAuth(async () => {
      if (
        window.confirm(
          'Atenção: Isso purgará roteadores, grupos e usuários de demonstração legados criados em versões anteriores à v2.2.0. Roteadores e contas reais em produção não serão afetados. Deseja continuar?'
        )
      ) {
        if (window.tclavisAPI?.clearDemoData) {
          await window.tclavisAPI.clearDemoData();
          onShowToast('Dados de demonstração legados purgados com sucesso.', 'success');
        }
      }
    });
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      handleLoadLogs();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Configurações & Segurança</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Gerencie proteção por PIN, ciclo de vida do aplicativo, limpeza de vouchers e atualizações
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-surface-border pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'security'
              ? 'bg-primary text-background shadow-glow-primary'
              : 'text-slate-400 hover:text-white hover:bg-surface-card'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Segurança & PIN</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'system'
              ? 'bg-primary text-background shadow-glow-primary'
              : 'text-slate-400 hover:text-white hover:bg-surface-card'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Sistema & Inicialização</span>
        </button>

        <button
          onClick={() => setActiveTab('purge')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'purge'
              ? 'bg-primary text-background shadow-glow-primary'
              : 'text-slate-400 hover:text-white hover:bg-surface-card'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Expurgo de Vouchers</span>
        </button>

        <button
          onClick={() => setActiveTab('updater')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'updater'
              ? 'bg-primary text-background shadow-glow-primary'
              : 'text-slate-400 hover:text-white hover:bg-surface-card'
          }`}
        >
          <DownloadCloud className="w-4 h-4" />
          <span>Atualizações</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'logs'
              ? 'bg-primary text-background shadow-glow-primary'
              : 'text-slate-400 hover:text-white hover:bg-surface-card'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Logs de Auditoria</span>
        </button>
      </div>

      {/* Tab 1: Segurança & PIN */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change PIN Card */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center text-accent-amber">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Alterar PIN Mestre</h3>
                <p className="text-xs text-slate-400">
                  Substitua o código exigido para desbloqueio e edições
                </p>
              </div>
            </div>

            {pinError && (
              <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-xl text-xs text-accent-red flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {pinSuccess && (
              <div className="p-3 bg-accent-emerald/10 border border-accent-emerald/20 rounded-xl text-xs text-accent-emerald flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>PIN Mestre alterado com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleChangePin} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  PIN Atual
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-sm text-slate-200 tracking-widest focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Novo PIN (4 a 8 dígitos)
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-sm text-slate-200 tracking-widest focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Confirmar Novo PIN
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-sm text-slate-200 tracking-widest focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={pinLoading || !oldPin || !newPin || !confirmPin}
                className="w-full mt-2 py-2.5 bg-primary hover:bg-primary-hover text-background rounded-xl text-xs font-bold transition shadow-glow-primary disabled:opacity-50"
              >
                {pinLoading ? 'Alterando...' : 'Salvar Novo PIN'}
              </button>
            </form>
          </div>

          {/* Session Timeout Card */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Tempo de Sessão Autorizada</h3>
                <p className="text-xs text-slate-400">
                  Tempo que o app permanece desbloqueado após digitar o PIN
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Durante este período você poderá visualizar senhas, adicionar, editar ou excluir
              usuários sem precisar redigitar o PIN a cada clique.
            </p>

            <div className="space-y-2 pt-2">
              {[
                { val: 1, label: '1 minuto' },
                { val: 5, label: '5 minutos (Recomendado)' },
                { val: 10, label: '10 minutos' },
                { val: 15, label: '15 minutos' },
                { val: 30, label: '30 minutos' },
                { val: 0, label: 'Sempre pedir PIN (Bloqueio Imediato)' },
              ].map((opt) => (
                <label
                  key={opt.val}
                  onClick={() => handleTimeoutChange(opt.val)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                    pinTimeoutMinutes === opt.val
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-surface-card border-surface-border text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span>{opt.label}</span>
                  {pinTimeoutMinutes === opt.val && <Check className="w-4 h-4 text-primary" />}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sistema & Inicialização */}
      {activeTab === 'system' && (
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-card max-w-2xl space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Comportamento do Aplicativo</h3>
              <p className="text-xs text-slate-400">
                Integração do tClavis com o Windows e ciclo de vida em background
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Toggle 1: Iniciar com o Windows */}
            <label className="flex items-start space-x-3 p-4 rounded-xl border border-surface-border bg-surface-card cursor-pointer hover:border-slate-600 transition">
              <input
                type="checkbox"
                checked={openAtLogin}
                onChange={(e) => setOpenAtLogin(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-surface-border text-primary focus:ring-0 bg-surface"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">
                  Iniciar tClavis junto com o Windows
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Inicia o motor de sincronização em segundo plano assim que você liga o computador.
                </div>
              </div>
            </label>

            {/* Toggle 2: Minimizar para bandeja */}
            <label className="flex items-start space-x-3 p-4 rounded-xl border border-surface-border bg-surface-card cursor-pointer hover:border-slate-600 transition">
              <input
                type="checkbox"
                checked={minimizeToTray}
                onChange={(e) => setMinimizeToTray(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-surface-border text-primary focus:ring-0 bg-surface"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">
                  Minimizar para a Bandeja do Sistema (Tray) ao fechar
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Ao clicar no &quot;X&quot;, o app continua rodando silenciosamente no canto do relógio
                  para manter a sincronização com os MikroTiks ativa.
                </div>
              </div>
            </label>
          </div>

          <button
            onClick={handleSaveSystem}
            disabled={systemLoading}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-background rounded-xl text-xs font-bold transition shadow-glow-primary disabled:opacity-50"
          >
            {systemLoading ? 'Salvando...' : 'Salvar Preferências do Sistema'}
          </button>
        </div>
      )}

      {/* Tab 3: Expurgo & Manutenção */}
      {activeTab === 'purge' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Voucher Purge Card */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Limpeza de Vouchers Obsoletos</h3>
                <p className="text-xs text-slate-400">
                  Otimização de memória RAM e Flash no MikroTik
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Vouchers temporários com tempo esgotado ou gerados e nunca utilizados ocupam
              desnecessariamente as tabelas do RouterOS. Use esta ferramenta para localizá-los e
              expurgá-los com segurança.
            </p>

            <button
              onClick={() => requireAuth(onOpenPurgeModal)}
              className="flex items-center justify-center space-x-2 w-full py-2.5 bg-accent-red/10 border border-accent-red/30 hover:bg-accent-red/20 text-accent-red rounded-xl text-xs font-bold transition"
            >
              <Flame className="w-4 h-4" />
              <span>Abrir Ferramenta de Expurgo</span>
            </button>
          </div>

          {/* Demo Data & Cache */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center text-slate-300">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Manutenção do Banco Local</h3>
                <p className="text-xs text-slate-400">
                  Gerenciamento da base SQLite interna do tClavis
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Purga roteadores, grupos e contas de teste legados que possam ter vindo de versões
              anteriores à v2.2.0, preservando estritamente suas configurações de roteadores e usuários reais.
            </p>

            <button
              onClick={handleClearDemo}
              className="flex items-center justify-center space-x-2 w-full py-2.5 bg-surface-card border border-surface-border hover:bg-surface-border text-slate-300 rounded-xl text-xs font-bold transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remover Dados de Demonstração Legados</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Atualizações do Aplicativo (GitHub Releases) */}
      {activeTab === 'updater' && (
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-card max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-glow-primary">
                <DownloadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Atualização do tClavis</h3>
                <p className="text-xs text-slate-400">
                  Versão atual instalada:{' '}
                  <span className="font-mono font-semibold text-primary">v{currentVersion}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdate || isDownloading}
              className="flex items-center space-x-2 px-4 py-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? 'Verificando...' : 'Verificar Atualizações'}</span>
            </button>
          </div>

          {updateError && (
            <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-xl text-xs text-accent-red flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{updateError}</span>
            </div>
          )}

          {updateInfo && !updateInfo.hasUpdate && (
            <div className="p-4 rounded-xl border border-accent-emerald/20 bg-accent-emerald/5 flex items-center space-x-3 text-accent-emerald">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-white">Você está utilizando a versão mais recente!</span>
                <p className="text-slate-400 mt-0.5">
                  Nenhuma atualização disponível no repositório oficial no momento.
                </p>
              </div>
            </div>
          )}

          {updateInfo && updateInfo.hasUpdate && (
            <div className="border border-primary/30 bg-primary/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Nova Versão Disponível
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-mono font-bold">
                    v{updateInfo.latestVersion}
                  </span>
                </div>
                {updateInfo.publishedAt && (
                  <span className="text-xs text-slate-400">
                    Lançada em: {new Date(updateInfo.publishedAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>

              {/* Release Notes */}
              <div className="bg-surface-card border border-surface-border rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-slate-300 font-mono whitespace-pre-wrap">
                {updateInfo.releaseNotes}
              </div>

              {/* Download Progress */}
              {isDownloading && downloadProgress && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Baixando instalador...</span>
                    <span className="font-mono font-bold text-primary">
                      {downloadProgress.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-border overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${downloadProgress.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>
                      {(downloadProgress.transferredBytes / 1024 / 1024).toFixed(1)} MB /{' '}
                      {(downloadProgress.totalBytes / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <span>
                      {(downloadProgress.speedBytesPerSec / 1024 / 1024).toFixed(2)} MB/s
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                {!isDownloaded ? (
                  <button
                    onClick={handleDownloadUpdate}
                    disabled={isDownloading}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-background rounded-xl text-xs font-bold transition shadow-glow-primary disabled:opacity-50"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>{isDownloading ? 'Baixando...' : 'Baixar Atualização'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleInstallUpdate}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-accent-emerald hover:bg-accent-emerald/90 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-accent-emerald/20 animate-pulse"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Instalar e Reiniciar Agora</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Logs de Auditoria */}
      {activeTab === 'logs' && (
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Histórico de Eventos & Auditoria</h3>
                <p className="text-xs text-slate-400">
                  Registro cronológico de sincronizações, autenticações e alterações
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleLoadLogs}
                disabled={logsLoading}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-surface-card border border-surface-border transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleClearLogs}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-accent-red hover:bg-accent-red/10 border border-accent-red/20 rounded-xl transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Histórico</span>
              </button>
            </div>
          </div>

          <div className="border border-surface-border rounded-xl overflow-hidden divide-y divide-surface-border max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhum registro de log encontrado.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-3 text-xs flex items-center justify-between hover:bg-surface-card transition">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                        log.level === 'error'
                          ? 'bg-accent-red/15 text-accent-red border border-accent-red/30'
                          : log.level === 'warning'
                          ? 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30'
                          : 'bg-primary/15 text-primary border border-primary/30'
                      }`}
                    >
                      {log.category}
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-4">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
