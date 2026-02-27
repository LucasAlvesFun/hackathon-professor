import { createContext, useContext, useState, useCallback } from 'react';
import { X, AlertTriangle, Sparkles, Brain, Info } from 'lucide-react';

const NotificationContext = createContext(null);

const ICONS = {
  alert: AlertTriangle,
  suggestion: Sparkles,
  insight: Brain,
  info: Info,
};

const STYLES = {
  alert: { bg: 'bg-dark-800', border: 'border-red-500/30', icon: 'text-red-400', title: 'text-red-300', text: 'text-red-400/80' },
  suggestion: { bg: 'bg-dark-800', border: 'border-primary-500/30', icon: 'text-primary-400', title: 'text-primary-300', text: 'text-primary-400/80' },
  insight: { bg: 'bg-dark-800', border: 'border-amber-500/30', icon: 'text-amber-400', title: 'text-amber-300', text: 'text-amber-400/80' },
  info: { bg: 'bg-dark-800', border: 'border-blue-500/30', icon: 'text-blue-400', title: 'text-blue-300', text: 'text-blue-400/80' },
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotif = { id, ...notification, createdAt: Date.now() };
    setNotifications(prev => [...prev, newNotif]);

    if (notification.autoDismiss !== false) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, notification.duration || 8000);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const pushAIInsights = useCallback((analysis) => {
    // Limita a no máximo 1 notificação consolidada para não poluir a tela
    const parts = [];

    if (analysis?.alunosEmRisco?.length > 0) {
      parts.push(`${analysis.alunosEmRisco.length} aluno(s) em risco`);
    }
    if (analysis?.alunosInvisiveis?.length > 0) {
      parts.push(`${analysis.alunosInvisiveis.length} aluno(s) invisível(eis)`);
    }
    if (analysis?.sugestoes?.length > 0) {
      parts.push(`${analysis.sugestoes.length} sugestão(ões) disponível(eis)`);
    }

    if (parts.length > 0) {
      addNotification({
        type: analysis?.alunosEmRisco?.length > 0 ? 'alert' : 'insight',
        title: 'Análise da turma concluída',
        message: parts.join(' · ') + '. Confira os detalhes no Dashboard.',
        duration: 10000,
      });
    }
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll, pushAIInsights }}>
      {children}
      {/* Notification container */}
      <div className="fixed top-4 right-4 z-[100] space-y-3 max-w-sm w-full pointer-events-none">
        {notifications.map(notif => {
          const style = STYLES[notif.type] || STYLES.info;
          const Icon = ICONS[notif.type] || Info;
          return (
            <div
              key={notif.id}
              className={`${style.bg} border ${style.border} rounded-2xl p-4 shadow-xl shadow-black/20 pointer-events-auto animate-in slide-in-from-right duration-300`}
              style={{ animation: 'slideInRight 0.3s ease-out' }}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <Icon className={`w-5 h-5 ${style.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${style.title}`}>{notif.title}</p>
                  <p className={`text-sm mt-0.5 ${style.text} leading-relaxed`}>{notif.message}</p>
                </div>
                <button
                  onClick={() => removeNotification(notif.id)}
                  className="shrink-0 p-1 hover:bg-white/10 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4 text-dark-100" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
