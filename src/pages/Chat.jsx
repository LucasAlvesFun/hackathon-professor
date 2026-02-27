import { useState, useRef, useEffect } from 'react';
import { useClassroom } from '../contexts/ClassroomContext';
import { chatWithTeacher } from '../services/aiClient';
import { Send, Bot, User, Loader2, Sparkles, Lightbulb } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'Quais alunos estão em risco de reprovação?',
  'Quais são os alunos invisíveis da minha turma?',
  'Sugira estratégias para engajar alunos desmotivados',
  'Analise o desempenho geral da turma',
  'Como posso melhorar a frequência dos alunos?',
  'Gere um resumo da situação atual da turma',
];

export default function Chat() {
  const { students, lessonPlan, courseConfig, aiAnalysis } = useClassroom();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá, professor! Sou o EduPilot AI. Posso ajudar com análises da turma, sugestões pedagógicas, dúvidas sobre o plano de aula e muito mais. Como posso ajudar?',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getContext = () => {
    return {
      alunos: students.map(s => ({ id: s._id, nome: s.name, ...s.extra })),
      totalAlunos: students.length,
      planoDeAula: lessonPlan?.plano?.titulo || 'Não configurado',
      configuracao: courseConfig ? {
        disciplina: courseConfig.disciplina,
        curso: courseConfig.curso,
        nivel: courseConfig.nivel,
        mediaMinima: courseConfig.mediaMinima,
        frequenciaMinima: courseConfig.frequenciaMinima,
      } : null,
      analiseAnterior: aiAnalysis,
    };
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMsg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const response = await chatWithTeacher(text.trim(), getContext());
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, houve um erro ao processar sua mensagem. Tente novamente.' }]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-dark-600 bg-dark-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Chat com EduPilot AI</h1>
            <p className="text-xs text-dark-100">
              {students.length > 0 ? `${students.length} alunos carregados no contexto` : 'Sem dados de alunos ainda'}
              {courseConfig?.disciplina ? ` • ${courseConfig.disciplina}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-primary-600/20' : 'bg-gradient-to-br from-primary-500 to-accent-500'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-primary-400" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div className={`max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-br-md'
                : 'bg-dark-700 border border-dark-500 text-gray-300 rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-primary-500 to-accent-500">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-dark-700 border border-dark-500 p-4 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-2 text-dark-100">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-dark-100">Sugestões</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={sending}
                className="px-3 py-1.5 bg-dark-700 border border-dark-500 rounded-full text-xs text-gray-300 hover:bg-primary-600/20 hover:border-primary-600/50 hover:text-primary-400 transition-all cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-dark-600 bg-dark-800">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={sending}
            className="flex-1 px-4 py-3 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-600/30 disabled:opacity-50"
            placeholder="Pergunte algo ao EduPilot AI..."
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-5 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
