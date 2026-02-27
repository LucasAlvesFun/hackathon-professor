import { Link } from 'react-router-dom';
import { Bot, Brain, Users, BookOpen, BarChart3, Sparkles, ArrowRight, CheckCircle2, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'IA que entende sua turma',
    desc: 'Análise automática de desempenho, frequência e comportamento dos alunos com inteligência artificial.',
  },
  {
    icon: Users,
    title: 'Mapa da Sala Visual',
    desc: 'Visualize cada aluno como uma cadeira na sala, com termômetro de engajamento e alertas em tempo real.',
  },
  {
    icon: BookOpen,
    title: 'Plano de Aula Inteligente',
    desc: 'Envie seus PDFs e bibliografias. A IA gera um calendário completo de aulas adaptado à sua realidade.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Analítico',
    desc: 'Veja alunos em risco, alunos invisíveis, média da turma e receba sugestões proativas.',
  },
];

const painPoints = [
  'Alunos que passam despercebidos até a reprovação',
  'Horas criando planos de aula manualmente',
  'Dificuldade de detectar padrões de risco',
  'Falta de dados unificados em um só lugar',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="fixed top-0 w-full bg-dark-900/80 backdrop-blur-lg border-b border-dark-600 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">EduPilot AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-dark-100 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link to="/register" className="text-sm font-medium bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-colors shadow-sm">
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600/20 rounded-full text-primary-400 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Powered by Gemini AI
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight">
              O copiloto que todo
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent"> professor </span>
              merece
            </h1>
            <p className="mt-6 text-xl text-dark-100 max-w-2xl mx-auto leading-relaxed">
              Chega de perder alunos no escuro. Use inteligência artificial para mapear sua sala,
              gerar planos de aula e receber alertas antes que seja tarde.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="flex items-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30"
              >
                Começar agora
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 bg-dark-700 text-gray-300 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-dark-600 transition-all"
              >
                Já tenho conta
              </Link>
            </div>
          </div>

          {/* Mock dashboard preview */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl p-2 shadow-2xl">
              <div className="bg-gray-900 rounded-xl p-1">
                <div className="flex items-center gap-2 px-4 py-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                </div>
                <div className="bg-dark-800 rounded-lg p-6">
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Alunos', value: '42', color: 'text-primary-600' },
                      { label: 'Em Risco', value: '7', color: 'text-red-500' },
                      { label: 'Média', value: '7.2', color: 'text-green-600' },
                      { label: 'Frequência', value: '84%', color: 'text-amber-500' },
                    ].map(c => (
                      <div key={c.label} className="bg-dark-700 p-4 rounded-xl border border-dark-500">
                        <p className="text-xs text-dark-100">{c.label}</p>
                        <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="bg-dark-700 p-3 rounded-xl border border-dark-500 text-center">
                        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          i % 5 === 0 ? 'bg-red-400' : i % 3 === 0 ? 'bg-amber-400' : 'bg-green-400'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <div className={`w-1.5 h-8 mx-auto mt-2 rounded-full ${
                          i % 5 === 0 ? 'bg-red-300' : i % 3 === 0 ? 'bg-amber-300' : 'bg-green-300'
                        }`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-20 px-6 bg-dark-800">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Você conhece essa dor?
            </h2>
            <p className="mt-4 text-lg text-dark-100">
              Problemas que todo professor enfrenta — e que a tecnologia pode resolver.
            </p>
          </div>
          <div className="max-w-2xl mx-auto space-y-4">
            {painPoints.map((pain, i) => (
              <div key={i} className="flex items-center gap-4 bg-dark-700 p-5 rounded-2xl border border-dark-500">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-gray-300 font-medium">{pain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Como o EduPilot AI resolve
            </h2>
            <p className="mt-4 text-lg text-dark-100">
              Ferramentas poderosas que transformam dados em ação.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-dark-800 p-8 rounded-2xl border border-dark-600 hover:border-primary-600/30 transition-all">
                <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-dark-100 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary-600 to-accent-700">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">
            Por que professores amam o EduPilot AI
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Zap, title: 'Economia de tempo', desc: 'Planos de aula gerados em minutos, não horas.' },
              { icon: CheckCircle2, title: 'Nenhum aluno esquecido', desc: 'IA identifica padrões invisíveis ao olho humano.' },
              { icon: Sparkles, title: 'Decisões baseadas em dados', desc: 'Sugestões proativas baseadas em dados reais da turma.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
                <Icon className="w-8 h-8 text-white mb-4 mx-auto" />
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-white/80">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-dark-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pronto para transformar sua sala de aula?
          </h2>
          <p className="text-lg text-dark-100 mb-10">
            Comece agora mesmo, sem cartão de crédito.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-10 py-4 rounded-2xl text-lg font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20"
          >
            Criar minha conta grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-dark-600">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-semibold text-white">EduPilot AI</span>
          </div>
          <p className="text-sm text-dark-100">Hackathon 2026 — Construído com Gemini AI</p>
        </div>
      </footer>
    </div>
  );
}
