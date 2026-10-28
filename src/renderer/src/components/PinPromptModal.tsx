import React, { useState, useEffect } from 'react';
import { X, Lock, Key, AlertTriangle, Clock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onSuccess: (timeoutMinutes: number) => void;
  onClose: () => void;
  timeoutMinutes?: number;
}

export const PinPromptModal: React.FC<Props> = ({
  isOpen,
  onSuccess,
  onClose,
  timeoutMinutes = 5,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    setLoading(true);
    setError(null);
    try {
      if (window.tclavisAPI?.verifyMasterPin) {
        const isValid = await window.tclavisAPI.verifyMasterPin(pin);
        if (isValid) {
          onSuccess(timeoutMinutes);
          onClose();
        } else {
          setError('PIN incorreto. Tente novamente.');
          setPin('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro na verificação do PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border bg-surface-card">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-accent-amber/15 border border-accent-amber/30 flex items-center justify-center text-accent-amber">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-white text-sm">PIN de Segurança</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-surface-card p-2.5 rounded-xl border border-surface-border">
            <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>
              Ao autenticar, você terá <strong>{timeoutMinutes} minutos</strong> de passe livre para editar e ver senhas.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
              Digite seu PIN Mestre:
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              required
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 bg-background border border-surface-border rounded-xl text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <div className="p-2 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-accent-rose text-xs flex items-center justify-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 rounded-xl bg-surface hover:bg-surface-border border border-surface-border text-slate-300 text-xs font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-1/2 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background text-xs font-semibold transition shadow-glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Validando...' : 'Desbloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
