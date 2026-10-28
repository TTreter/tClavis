import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-up text-xs ${
            toast.type === 'success'
              ? 'bg-surface/90 border-accent-emerald/40 text-slate-100 shadow-accent-emerald/10'
              : toast.type === 'error'
              ? 'bg-surface/90 border-accent-rose/40 text-slate-100 shadow-accent-rose/10'
              : toast.type === 'warning'
              ? 'bg-surface/90 border-accent-amber/40 text-slate-100 shadow-accent-amber/10'
              : 'bg-surface/90 border-primary/40 text-slate-100 shadow-primary/10'
          }`}
        >
          <div className="flex items-center space-x-2.5 mr-2">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-accent-emerald flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-accent-rose flex-shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-primary flex-shrink-0" />}
            <span className="font-medium leading-tight">{toast.message}</span>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
