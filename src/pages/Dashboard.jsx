import { useEffect, useState } from 'react';
import { useClassroom } from '../contexts/ClassroomContext';
import { useNotifications } from '../contexts/NotificationContext';
import { analyzeClassroom } from '../services/aiClient';
import { Users, AlertTriangle, TrendingUp, Clock, Eye, Brain, Sparkles, Loader2, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { students, fetchStudents, aiAnalysis, setAiAnalysis, loading } = useClassroom();
  const { pushAIInsights, addNotification } = useNotifications();
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const runAnalysis = async () => {
    if (students.length === 0) return;
    setAnalyzing(true);
    try {
      const result = await analyzeClassroom(students);
      setAiAnalysis(result);
      pushAIInsights(result);
    } catch (err) {
      console.error('Erro na análise:', err);
      addNotification({ type: 'alert', title: 'Erro na análise', message: 'Falha ao analisar dados da turma. Tente novamente.' });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (students.length > 0 && !aiAnalysis) {
      runAnalysis();
    }
  }, [students]);

  const totalAlunos = students.length;
  const alunosEmRisco = aiAnalysis?.alunosEmRisco?.length || students.filter(s => {
    const notas = s.extra || {};
    const notaValues = Object.entries(notas).filter(([k]) => k.startsWith('prova') || k.startsWith('trabalho')).map(([, v]) => Number(v));
    const media = notaValues.length > 0 ? notaValues.reduce((a, b) => a + b, 0) / notaValues.length : 0;
    return media < 6 || (notas.frequencia && Number(notas.frequencia) < 75);
  }).length;
  const alunosInvisiveis = aiAnalysis?.alunosInvisiveis?.length || 0;

  const mediaGeral = aiAnalysis?.mediaGeral || (() => {
    if (students.length === 0) return 0;
    let total = 0, count = 0;
    students.forEach(s => {
      Object.entries(s.extra || {}).forEach(([k, v]) => {
        if (k.startsWith('prova') || k.startsWith('trabalho')) {
          total += Number(v);
          count++;
        }
      });
    });
    return count > 0 ? (total / count).toFixed(1) : 0;
  })();

  const freqMedia = aiAnalysis?.frequenciaMedia || (() => {
    if (students.length === 0) return 0;
    const freqs = students.map(s => Number(s.extra?.frequencia || 0)).filter(f => f > 0);
    return freqs.length > 0 ? (freqs.reduce((a, b) => a + b, 0) / freqs.length).toFixed(0) : 0;
  })();

  const cards = [
    { icon: Users, label: 'Total de Alunos', value: totalAlunos, color: 'text-primary-500', bg: 'bg-primary-600/20' },
    { icon: Eye, label: 'Alunos Invisíveis', value: alunosInvisiveis, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { icon: AlertTriangle, label: 'Alunos em Risco', value: alunosEmRisco, color: 'text-red-400', bg: 'bg-red-500/20' },
    { icon: TrendingUp, label: 'Média da Turma', value: mediaGeral, color: 'text-green-400', bg: 'bg-green-500/20' },
    { icon: Clock, label: 'Frequência Média', value: `${freqMedia}%`, color: 'text-violet-400', bg: 'bg-violet-500/20' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-dark-100 mt-1">Visão geral da sua turma</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing || students.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {analyzing ? 'Analisando...' : 'Analisar com IA'}
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-dark-700 p-5 rounded-2xl border border-dark-500">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
            <p className="text-xs text-dark-100 font-medium uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-bold ${color} mt-1`}>{loading ? '...' : value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alertas */}
        <div className="bg-dark-700 p-6 rounded-2xl border border-dark-500">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Alertas</h2>
          </div>
          {analyzing ? (
            <div className="flex items-center justify-center py-12 text-dark-100">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Analisando dados...
            </div>
          ) : aiAnalysis?.insights?.length > 0 ? (
            <div className="space-y-3">
              {aiAnalysis.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Brain className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300">{insight}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-dark-100">
              <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Adicione alunos e clique em "Analisar com IA" para ver alertas</p>
            </div>
          )}
        </div>

        {/* Sugestões proativas */}
        <div className="bg-dark-700 p-6 rounded-2xl border border-dark-500">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold text-white">Sugestões da IA</h2>
          </div>
          {analyzing ? (
            <div className="flex items-center justify-center py-12 text-dark-100">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Gerando sugestões...
            </div>
          ) : aiAnalysis?.sugestoes?.length > 0 ? (
            <div className="space-y-3">
              {aiAnalysis.sugestoes.map((sug, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-primary-600/10 border border-primary-600/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300">{sug}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-dark-100">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sugestões aparecerão após a análise da IA</p>
            </div>
          )}
        </div>
      </div>

      {/* Alunos em risco e invisíveis lista */}
      {aiAnalysis && (
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          {aiAnalysis.alunosEmRisco?.length > 0 && (
            <div className="bg-dark-700 p-6 rounded-2xl border border-red-500/20">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Alunos em Risco
              </h3>
              <div className="space-y-2">
                {aiAnalysis.alunosEmRisco.map((item, idx) => {
                  const id = typeof item === 'string' ? item : item._id;
                  const motivo = typeof item === 'object' ? item.motivo : null;
                  const student = students.find(s => s._id === id);
                  return (
                    <div key={id || idx} className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
                      <div className="w-8 h-8 bg-red-500/30 rounded-full flex items-center justify-center text-xs font-bold text-red-300 shrink-0">
                        {(student?.name || id || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm text-gray-300 font-medium">{student?.name || id}</span>
                        {motivo && <p className="text-xs text-red-400/70 mt-0.5">{motivo}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {aiAnalysis.alunosInvisiveis?.length > 0 && (
            <div className="bg-dark-700 p-6 rounded-2xl border border-amber-500/20">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                Alunos Invisíveis
              </h3>
              <div className="space-y-2">
                {aiAnalysis.alunosInvisiveis.map((item, idx) => {
                  const id = typeof item === 'string' ? item : item._id;
                  const motivo = typeof item === 'object' ? item.motivo : null;
                  const student = students.find(s => s._id === id);
                  return (
                    <div key={id || idx} className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg">
                      <div className="w-8 h-8 bg-amber-500/30 rounded-full flex items-center justify-center text-xs font-bold text-amber-300 shrink-0">
                        {(student?.name || id || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm text-gray-300 font-medium">{student?.name || id}</span>
                        {motivo && <p className="text-xs text-amber-400/70 mt-0.5">{motivo}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
