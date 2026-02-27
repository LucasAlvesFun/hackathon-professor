import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Loader2 } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (password.length < 3) {
      setLocalError('Senha deve ter pelo menos 3 caracteres');
      return;
    }
    try {
      await login(username, password);
      navigate('/app');
    } catch {
      setLocalError('Falha ao criar conta. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">EduPilot AI</span>
          </Link>
          <h2 className="text-2xl font-bold text-white">Crie sua conta</h2>
          <p className="text-dark-100 mt-1">Comece a usar o EduPilot AI agora</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-dark-800 p-8 rounded-2xl border border-dark-600">
          {localError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              {localError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-dark-500 bg-dark-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-600/30 outline-none transition-all text-sm"
                placeholder="Prof. Maria Silva"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-dark-500 bg-dark-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-600/30 outline-none transition-all text-sm"
                placeholder="Escolha um nome de usuário"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-dark-500 bg-dark-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-600/30 outline-none transition-all text-sm"
                placeholder="Crie uma senha"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Criando conta...
              </>
            ) : (
              'Criar conta'
            )}
          </button>

          <p className="text-center text-sm text-dark-100 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
