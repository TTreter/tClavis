import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onPinConfigured: () => void;
}

export const PinSetupModal: React.FC<Props> = ({ isOpen, onPinConfigured }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin.length < 4 || pin.length > 8) {
      setError('O PIN deve conter entre 4 e 8 dígitos numéricos.');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      setError('O PIN deve conter apenas números.');
      return;
    }

    if (pin !== confirmPin) {
      setError('Os PINs digitados não coincidem.');
      return;
    }

    setLoading(true);
    try {
      if (window.tclavisAPI?.setMasterPin) {
        await window.tclavisAPI.setMasterPin(pin);
        onPinConfigured();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-surface border border-surface-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-surface-card via-surface-card to-primary/10 border-b border-surface-border text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-3 shadow-glow-primary">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Criar PIN de Segurança</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Proteja o tClavis contra edições não autorizadas e vazamento de senhas
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-slate-300">
            Qualquer pessoa poderá abrir o app para visualizar a lista de usuários, mas será necessário digitar este PIN para <strong>revelar senhas, editar ou excluir contas</strong>.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Novo PIN Mestre (4 a 8 dígitos) *
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              required
              autoFocus
              placeholder="Ex: 1234"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 bg-background border border-surface-border rounded-xl text-white text-center text-lg tracking-widest font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Confirmar Novo PIN *
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              required
              placeholder="Digite o mesmo PIN novamente"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 bg-background border border-surface-border rounded-xl text-white text-center text-lg tracking-widest font-mono focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-accent-rose text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition shadow-glow-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Key className="w-4 h-4" />
              <span>{loading ? 'Registrando...' : 'Salvar PIN e Iniciar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
