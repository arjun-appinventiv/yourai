import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [exiting, setExiting] = useState(false);

  const showToast = useCallback((message) => {
    setExiting(false);
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setExiting(true), 2500);
    const remove = setTimeout(() => { setToast(null); setExiting(false); }, 3000);
    return () => { clearTimeout(timer); clearTimeout(remove); };
  }, [toast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          className={`fixed bottom-16 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg text-white text-sm font-medium ${exiting ? 'toast-exit' : 'toast-enter'}`}
          style={{ backgroundColor: '#5CA868', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        >
          <CheckCircle size={18} />
          {toast}
        </div>
      )}
    </ToastContext.Provider>
  );
}
