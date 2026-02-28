import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, BookOpen, MessageCircle, LogOut, Bot, Settings } from 'lucide-react';

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Painel', end: true },
  { to: '/app/alunos', icon: Users, label: 'Alunos' },
  { to: '/app/plano', icon: BookOpen, label: 'Planos de Aula' },
  { to: '/app/chat', icon: MessageCircle, label: 'Chat IA' },
];

export default function AppLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-dark-900">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0">
        <div className="p-6 border-b border-dark-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">EduPilot AI</h1>
              <p className="text-xs text-dark-100">Assistente do Professor</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-500 shadow-sm'
                    : 'text-dark-100 hover:bg-dark-600 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-600">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 bg-primary-600/30 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-500">
                {user?.name?.charAt(0)?.toUpperCase() || 'P'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Professor'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full rounded-xl text-sm text-dark-100 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-dark-900">
        <Outlet />
      </main>
    </div>
  );
}
