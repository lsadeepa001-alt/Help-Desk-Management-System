import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed top-20 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-fade-in transition duration-300 ${
              t.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
                : t.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-rose-300 shadow-rose-950/40'
                : 'bg-slate-900/95 border-indigo-500/40 text-indigo-300 shadow-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-semibold leading-relaxed">
              <span className="text-base">
                {t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : '🔔'}
              </span>
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white text-xs p-1 transition"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
