import { useState, useEffect } from 'react';
import { useClassroom } from '../contexts/ClassroomContext';
import { useNotifications } from '../contexts/NotificationContext';
import { generateLessonPlan, processNotebookLM } from '../services/aiClient';
import {
  BookOpen, Calendar, ChevronDown, ChevronUp, Edit3, FileUp, Loader2, Plus, Save,
  Sparkles, Trash2, Upload, GraduationCap, Clock, Award, Users, FolderOpen,
  Target, BookMarked, CheckCircle2, FileText, RefreshCw,
} from 'lucide-react';

const NIVEIS = ['Ensino Fundamental', 'Ensino Médio', 'Graduação', 'Pós-graduação'];
const ESTRUTURAS = ['Anual', 'Semestral'];
const SUBDIVISOES = ['Bimestral', 'Trimestral', 'Etapas'];

const INITIAL_CONFIG = {
  nivel: 'Graduação',
  curso: '',
  disciplina: '',
  objetivo: '',
  estrutura: 'Semestral',
  subdivisao: 'Etapas',
  numEtapas: 3,
  provasPorEtapa: 1,
  trabalhosPorEtapa: 1,
  pesoProva: 60,
  pesoTrabalho: 40,
  mediaMinima: 7,
  frequenciaMinima: 75,
  aulasPorSemana: 2,
  duracaoAula: 50,
  dataInicio: '',
  dataFim: '',
  diasAula: ['seg', 'qua'],
  perfilTurma: '',
  insightsProfessor: '',
};

// Robust JSON parser for AI output
function tryParseRawPlan(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const attemptParse = (str) => {
    try {
      const parsed = JSON.parse(str);
      if (parsed?.plano?.etapas) return parsed;
      if (parsed?.etapas) return { plano: parsed };
      if (parsed?.plano) return parsed;
    } catch { /* ignore */ }
    try {
      const fixed = str.replace(/,\s*([}\]])/g, '$1');
      const parsed = JSON.parse(fixed);
      if (parsed?.plano?.etapas) return parsed;
      if (parsed?.etapas) return { plano: parsed };
      if (parsed?.plano) return parsed;
    } catch { /* ignore */ }
    return null;
  };

  // Strategy 1: Code fences
  const codeFenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeFenceMatch) {
    const result = attemptParse(codeFenceMatch[1].trim());
    if (result) return result;
  }

  // Strategy 2: Full text without fences
  const text = raw.replace(/```(?:json)?\s*\n?/g, '').replace(/```/g, '').trim();
  let result = attemptParse(text);
  if (result) return result;

  // Strategy 3: Outermost braces
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    result = attemptParse(text.substring(firstBrace, lastBrace + 1));
    if (result) return result;
  }

  return null;
}

// Normalize lessonPlan: parse .raw if needed
function normalizePlan(plan) {
  if (!plan) return null;
  if (plan?.plano?.etapas) return plan;
  if (plan?.raw) {
    const parsed = tryParseRawPlan(plan.raw);
    if (parsed) return { ...plan, ...parsed };
  }
  return plan;
}

// Formatted renderer for raw AI output when structured parsing fails
function FormattedRawContent({ raw }) {
  if (!raw) return null;

  const renderInline = (text) => {
    if (!text.includes('**')) return text;
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <strong key={i} className="text-white font-semibold">{part}</strong>
        : <span key={i}>{part}</span>
    );
  };

  const lines = raw.split('\n');

  return (
    <div className="bg-dark-800 p-6 rounded-2xl border border-dark-600 space-y-2">
      <h3 className="font-bold text-white mb-3">Resultado da IA</h3>
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-1" />;

          const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)/);
          if (headingMatch) {
            const styles = {
              1: 'text-xl font-bold text-white mt-5 first:mt-0',
              2: 'text-lg font-semibold text-white mt-4 first:mt-0',
              3: 'text-base font-medium text-gray-200 mt-3 first:mt-0',
            };
            return <p key={i} className={styles[headingMatch[1].length]}>{renderInline(headingMatch[2])}</p>;
          }

          if (trimmed.match(/^[-*•]\s/)) {
            return (
              <div key={i} className="flex items-start gap-2 ml-3">
                <span className="text-primary-400 mt-1.5 text-[8px]">●</span>
                <span className="text-sm text-gray-300">{renderInline(trimmed.replace(/^[-*•]\s/, ''))}</span>
              </div>
            );
          }

          const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
          if (numMatch) {
            return (
              <div key={i} className="flex items-start gap-2 ml-3">
                <span className="text-primary-400 font-semibold text-sm min-w-[20px]">{numMatch[1]}.</span>
                <span className="text-sm text-gray-300">{renderInline(numMatch[2])}</span>
              </div>
            );
          }

          return <p key={i} className="text-sm text-gray-300 leading-relaxed">{renderInline(trimmed)}</p>;
        })}
      </div>
    </div>
  );
}

const tipoConfig = {
  aula: { label: 'Aula', icon: BookOpen, bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  prova: { label: 'Prova', icon: FileText, bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
  trabalho: { label: 'Trabalho', icon: Award, bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  revisao: { label: 'Revisão', icon: CheckCircle2, bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300' },
  recesso: { label: 'Recesso', icon: Calendar, bg: 'bg-dark-600', border: 'border-dark-500', text: 'text-dark-100', badge: 'bg-dark-500 text-dark-100' },
};

export default function PlanoAula() {
  const {
    saveCourseConfig, loadCourseConfig,
    saveLessonPlan, lessonPlan, setLessonPlan, resetLessonPlan,
    savedPlans, listSavedPlans, loadSavedPlan,
  } = useClassroom();
  const { addNotification } = useNotifications();

  // Task 1: Local form state — always starts fresh (no auto-load of previous plan)
  const [config, setConfig] = useState({ ...INITIAL_CONFIG });
  const [pdfContent, setPdfContent] = useState('');
  const [links, setLinks] = useState('');
  const [bibliography, setBibliography] = useState('');
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extractedTopics, setExtractedTopics] = useState(null);
  const [editingAula, setEditingAula] = useState(null);
  const [step, setStep] = useState(1);
  const [expandedEtapas, setExpandedEtapas] = useState({});
  const [expandedAulas, setExpandedAulas] = useState({});
  const [saving, setSaving] = useState(false);

  // Task 1: Reset plan state on mount — each visit starts clean
  useEffect(() => {
    resetLessonPlan();
    listSavedPlans();
    // Task 2: Load course_config silently in background for AI prompt context only
    loadCourseConfig();
  }, []);

  const toggleEtapa = (idx) => {
    setExpandedEtapas(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleAula = (etapaIdx, aulaIdx) => {
    const key = `${etapaIdx}-${aulaIdx}`;
    setExpandedAulas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Normalize the current plan for display
  const displayPlan = normalizePlan(lessonPlan);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setProcessing(true);
    try {
      let allContent = '';
      for (const file of files) {
        const text = await file.text();
        allContent += `\n--- ${file.name} ---\n${text}\n`;
      }
      if (bibliography) allContent += `\n--- Bibliografia ---\n${bibliography}\n`;
      if (links) allContent += `\n--- Links ---\n${links}\n`;

      const result = await processNotebookLM(allContent);
      setExtractedTopics(result);
      setPdfContent(allContent);
    } catch (err) {
      console.error('Erro ao processar arquivos:', err);
      addNotification({ type: 'alert', title: 'Erro ao processar', message: 'Não foi possível processar os arquivos enviados.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Task 2: Save config silently in background (for AI context only)
      await saveCourseConfig(config);

      let result = await generateLessonPlan({
        ...config,
        topicosExtraidos: extractedTopics,
        conteudoExtra: bibliography + '\n' + links,
      });

      // Try to parse raw result into structured plan
      if (result?.raw && !result?.plano) {
        const parsed = tryParseRawPlan(result.raw);
        if (parsed) result = { ...result, ...parsed };
      }

      setLessonPlan(result);
    } catch (err) {
      console.error('Erro ao gerar plano:', err);
      addNotification({ type: 'alert', title: 'Erro na geração', message: 'Não foi possível gerar o plano de aula. Tente novamente.' });
    } finally {
      setGenerating(false);
    }
  };

  const updateAula = (etapaIdx, aulaIdx, field, value) => {
    if (!lessonPlan?.plano) return;
    const updated = JSON.parse(JSON.stringify(lessonPlan));
    updated.plano.etapas[etapaIdx].aulas[aulaIdx][field] = value;
    setLessonPlan(updated);
  };

  const addAula = (etapaIdx) => {
    if (!lessonPlan?.plano) return;
    const updated = JSON.parse(JSON.stringify(lessonPlan));
    const etapa = updated.plano.etapas[etapaIdx];
    etapa.aulas.push({
      numero: etapa.aulas.length + 1,
      data: '',
      tipo: 'aula',
      titulo: 'Nova aula',
      conteudo: '',
      objetivos: [],
      referencias: [],
    });
    setLessonPlan(updated);
  };

  const removeAula = (etapaIdx, aulaIdx) => {
    if (!lessonPlan?.plano) return;
    const updated = JSON.parse(JSON.stringify(lessonPlan));
    updated.plano.etapas[etapaIdx].aulas.splice(aulaIdx, 1);
    setLessonPlan(updated);
  };

  // Task 6: Save always inserts a new record + shows toast feedback
  const savePlan = async () => {
    setSaving(true);
    try {
      await saveLessonPlan(lessonPlan);
      addNotification({
        type: 'suggestion',
        title: 'Plano salvo',
        message: 'Plano de aula salvo com sucesso!',
        duration: 5000,
      });
    } catch (err) {
      console.error('Erro ao salvar plano:', err);
      addNotification({ type: 'alert', title: 'Erro ao salvar', message: 'Não foi possível salvar o plano. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  // Task 1: Reset everything to start a new plan from scratch
  const handleNewPlan = () => {
    resetLessonPlan();
    setConfig({ ...INITIAL_CONFIG });
    setPdfContent('');
    setLinks('');
    setBibliography('');
    setExtractedTopics(null);
    setEditingAula(null);
    setExpandedEtapas({});
    setExpandedAulas({});
    setStep(1);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerador de Plano de Aula</h1>
          <p className="text-dark-100 mt-1">Configure sua disciplina e gere um plano com IA</p>
        </div>
        <div className="flex items-center gap-3">
          {lessonPlan && (
            <>
              <button onClick={handleNewPlan} className="flex items-center gap-2 px-4 py-2.5 bg-dark-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-dark-600 cursor-pointer">
                <Plus className="w-4 h-4" />
                Novo Plano
              </button>
              <button onClick={savePlan} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 cursor-pointer">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Plano
              </button>
            </>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { n: 1, label: 'Configuração' },
          { n: 2, label: 'Material de Apoio' },
          { n: 3, label: 'Gerar Plano' },
          { n: 4, label: 'Planos Salvos' },
        ].map(({ n, label }) => (
          <button
            key={n}
            onClick={() => setStep(n)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              step === n ? 'bg-primary-600 text-white shadow-sm' : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
              step === n ? 'bg-white/20 text-white' : 'bg-dark-600 text-dark-100'
            }`}>
              {n}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* Step 1: Configuração */}
      {step === 1 && (
        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-600 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary-600" />
            Configuração da Disciplina
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nível de Ensino</label>
              <select value={config.nivel} onChange={e => setConfig(p => ({ ...p, nivel: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500">
                {NIVEIS.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Curso</label>
              <input type="text" value={config.curso} onChange={e => setConfig(p => ({ ...p, curso: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" placeholder="Ex: Ciência da Computação" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Disciplina / Matéria</label>
              <input type="text" value={config.disciplina} onChange={e => setConfig(p => ({ ...p, disciplina: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" placeholder="Ex: Estrutura de Dados" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Objetivo Geral</label>
              <input type="text" value={config.objetivo} onChange={e => setConfig(p => ({ ...p, objetivo: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" placeholder="Ex: Dominar algoritmos e estruturas" />
            </div>
          </div>

          <hr className="border-dark-600" />

          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            Estrutura de Aulas
          </h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Estrutura</label>
              <select value={config.estrutura} onChange={e => setConfig(p => ({ ...p, estrutura: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500">
                {ESTRUTURAS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Subdivisão</label>
              <select value={config.subdivisao} onChange={e => setConfig(p => ({ ...p, subdivisao: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500">
                {SUBDIVISOES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nº de Etapas</label>
              <input type="number" min="1" max="6" value={config.numEtapas} onChange={e => setConfig(p => ({ ...p, numEtapas: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Provas por etapa</label>
              <input type="number" min="0" max="5" value={config.provasPorEtapa} onChange={e => setConfig(p => ({ ...p, provasPorEtapa: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Trabalhos por etapa</label>
              <input type="number" min="0" max="5" value={config.trabalhosPorEtapa} onChange={e => setConfig(p => ({ ...p, trabalhosPorEtapa: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Peso da Prova (%)</label>
              <input type="number" min="0" max="100" value={config.pesoProva} onChange={e => setConfig(p => ({ ...p, pesoProva: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Peso do Trabalho (%)</label>
              <input type="number" min="0" max="100" value={config.pesoTrabalho} onChange={e => setConfig(p => ({ ...p, pesoTrabalho: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
          </div>

          <hr className="border-dark-600" />

          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-primary-600" />
            Parâmetros de Aprovação
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Média mínima para aprovação</label>
              <input type="number" min="0" max="10" step="0.5" value={config.mediaMinima} onChange={e => setConfig(p => ({ ...p, mediaMinima: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Frequência mínima (%)</label>
              <input type="number" min="0" max="100" value={config.frequenciaMinima} onChange={e => setConfig(p => ({ ...p, frequenciaMinima: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
          </div>

          <hr className="border-dark-600" />

          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            Perfil da Turma e Estilo de Ensino
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Perfil da Turma</label>
            <textarea
              value={config.perfilTurma}
              onChange={e => setConfig(p => ({ ...p, perfilTurma: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Descreva o perfil da turma: nível de conhecimento prévio, faixa etária, interesses, dificuldades comuns, se é turma noturna/diurna, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Suas ideias e insights de ensino</label>
            <textarea
              value={config.insightsProfessor}
              onChange={e => setConfig(p => ({ ...p, insightsProfessor: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Compartilhe como você gostaria de ensinar: metodologias preferidas (sala invertida, gamificação, projetos práticos), abordagem teórica vs. prática, dinâmicas de grupo, etc."
            />
          </div>

          <hr className="border-dark-600" />

          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-600" />
            Horários e Datas
          </h3>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Aulas por semana</label>
              <input type="number" min="1" max="7" value={config.aulasPorSemana} onChange={e => setConfig(p => ({ ...p, aulasPorSemana: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Duração da aula (min)</label>
              <input type="number" min="30" max="240" step="10" value={config.duracaoAula} onChange={e => setConfig(p => ({ ...p, duracaoAula: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Data de início</label>
              <input type="date" value={config.dataInicio} onChange={e => setConfig(p => ({ ...p, dataInicio: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Data de término</label>
              <input type="date" value={config.dataFim} onChange={e => setConfig(p => ({ ...p, dataFim: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500" />
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 cursor-pointer">
              Próximo: Material de Apoio →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Material de Apoio */}
      {step === 2 && (
        <div className="bg-dark-800 p-6 rounded-2xl border border-dark-600 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary-600" />
            Material de Apoio
          </h2>
          <p className="text-sm text-dark-100">Envie PDFs, bibliografias e links. A IA irá extrair o conteúdo e organizar os tópicos das aulas.</p>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Upload de PDFs / Documentos</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-dark-500 rounded-xl hover:border-primary-400 transition-colors cursor-pointer bg-dark-700">
              <Upload className="w-8 h-8 text-dark-100 mb-2" />
              <span className="text-sm text-dark-100">Clique para enviar PDFs, TXT ou documentos</span>
              <input type="file" multiple accept=".pdf,.txt,.doc,.docx" onChange={handleFileUpload} className="hidden" />
            </label>
            {processing && (
              <div className="flex items-center gap-2 mt-3 text-primary-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processando conteúdo com IA...</span>
              </div>
            )}
            {extractedTopics && !extractedTopics.raw && (
              <div className="mt-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <p className="text-sm font-medium text-green-400 mb-2">Tópicos extraídos com sucesso!</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Bibliografia</label>
            <textarea
              value={bibliography}
              onChange={e => setBibliography(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Cole aqui as referências bibliográficas, livros, artigos..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Links complementares</label>
            <textarea
              value={links}
              onChange={e => setLinks(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Links de referência separados por linha"
            />
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-6 py-2.5 bg-dark-700 text-gray-300 rounded-xl font-medium text-sm hover:bg-dark-600 cursor-pointer">
              ← Voltar
            </button>
            <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 cursor-pointer">
              Próximo: Gerar Plano →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Gerar Plano + Visualização */}
      {step === 3 && (
        <div className="space-y-6">
          {!lessonPlan && (
            <div className="bg-dark-800 p-8 rounded-2xl border border-dark-600 text-center">
              <Sparkles className="w-12 h-12 text-primary-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Tudo pronto!</h2>
              <p className="text-dark-100 mb-6 max-w-md mx-auto">
                A IA irá gerar um calendário completo com base nas suas configurações
                {extractedTopics ? ' e no material enviado' : ''}.
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setStep(1)} className="px-6 py-2.5 bg-dark-700 text-gray-300 rounded-xl font-medium text-sm hover:bg-dark-600 cursor-pointer">
                  ← Revisar Configuração
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 cursor-pointer"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando plano...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Gerar Plano de Aula com IA
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Task 3: Styled Plan View */}
          {displayPlan?.plano?.etapas && (
            <div className="space-y-6">
              {/* Plan Header */}
              <div className="bg-gradient-to-br from-primary-600/20 via-dark-800 to-dark-800 p-8 rounded-2xl border border-primary-600/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-primary-600/20 rounded-xl">
                      <GraduationCap className="w-8 h-8 text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white mb-2">{displayPlan.plano.titulo}</h2>
                      {displayPlan.plano.ementa && (
                        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">{displayPlan.plano.ementa}</p>
                      )}
                    </div>
                  </div>

                  {/* Plan Stats */}
                  {(() => {
                    const etapas = displayPlan.plano.etapas || [];
                    const totalAulas = etapas.reduce((sum, e) => sum + (e.aulas?.filter(a => a.tipo === 'aula')?.length || 0), 0);
                    const totalProvas = etapas.reduce((sum, e) => sum + (e.aulas?.filter(a => a.tipo === 'prova')?.length || 0), 0);
                    const totalTrabalhos = etapas.reduce((sum, e) => sum + (e.aulas?.filter(a => a.tipo === 'trabalho')?.length || 0), 0);
                    const totalRevisoes = etapas.reduce((sum, e) => sum + (e.aulas?.filter(a => a.tipo === 'revisao')?.length || 0), 0);
                    return (
                      <div className="flex flex-wrap gap-3 mt-5">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-700/60 rounded-lg border border-dark-600">
                          <FolderOpen className="w-3.5 h-3.5 text-primary-400" />
                          <span className="text-xs text-gray-300"><strong className="text-white">{etapas.length}</strong> {etapas.length === 1 ? 'etapa' : 'etapas'}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-700/60 rounded-lg border border-dark-600">
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs text-gray-300"><strong className="text-white">{totalAulas}</strong> {totalAulas === 1 ? 'aula' : 'aulas'}</span>
                        </div>
                        {totalProvas > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-700/60 rounded-lg border border-dark-600">
                            <FileText className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-xs text-gray-300"><strong className="text-white">{totalProvas}</strong> {totalProvas === 1 ? 'prova' : 'provas'}</span>
                          </div>
                        )}
                        {totalTrabalhos > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-700/60 rounded-lg border border-dark-600">
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs text-gray-300"><strong className="text-white">{totalTrabalhos}</strong> {totalTrabalhos === 1 ? 'trabalho' : 'trabalhos'}</span>
                          </div>
                        )}
                        {totalRevisoes > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-700/60 rounded-lg border border-dark-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-xs text-gray-300"><strong className="text-white">{totalRevisoes}</strong> {totalRevisoes === 1 ? 'revisão' : 'revisões'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Etapas */}
              {displayPlan.plano.etapas.map((etapa, etapaIdx) => {
                const isExpanded = expandedEtapas[etapaIdx] !== false;
                const aulaCount = etapa.aulas?.filter(a => a.tipo === 'aula')?.length || 0;
                const provaCount = etapa.aulas?.filter(a => a.tipo === 'prova')?.length || 0;
                const trabalhoCount = etapa.aulas?.filter(a => a.tipo === 'trabalho')?.length || 0;
                const firstDate = etapa.aulas?.find(a => a.data)?.data;
                const lastDate = [...(etapa.aulas || [])].reverse().find(a => a.data)?.data;

                return (
                  <div key={etapaIdx} className="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden">
                    {/* Etapa Header */}
                    <button
                      onClick={() => toggleEtapa(etapaIdx)}
                      className="w-full p-5 bg-dark-700/50 border-b border-dark-600 flex items-center justify-between hover:bg-dark-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
                          <span className="text-primary-400 font-bold text-sm">{etapaIdx + 1}</span>
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-white text-base">{etapa.nome || `Etapa ${etapaIdx + 1}`}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            {firstDate && lastDate && (
                              <span className="text-xs text-gray-400">
                                {new Date(firstDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — {new Date(lastDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              {aulaCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{aulaCount} {aulaCount === 1 ? 'aula' : 'aulas'}</span>}
                              {provaCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">{provaCount} {provaCount === 1 ? 'prova' : 'provas'}</span>}
                              {trabalhoCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{trabalhoCount} {trabalhoCount === 1 ? 'trabalho' : 'trabalhos'}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          onClick={(e) => { e.stopPropagation(); addAula(etapaIdx); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary-600/20 text-primary-400 rounded-lg text-xs font-medium hover:bg-primary-600/30 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Aula
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </button>

                    {/* Aulas List */}
                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {etapa.aulas?.map((aula, aulaIdx) => {
                          const tipo = tipoConfig[aula.tipo] || tipoConfig.aula;
                          const TipoIcon = tipo.icon;
                          const aulaKey = `${etapaIdx}-${aulaIdx}`;
                          const isAulaExpanded = expandedAulas[aulaKey];

                          return (
                            <div key={aulaIdx} className={`rounded-xl border overflow-hidden transition-all ${tipo.bg} ${tipo.border}`}>
                              {editingAula?.etapa === etapaIdx && editingAula?.aula === aulaIdx ? (
                                /* Editing mode */
                                <div className="p-4 space-y-3">
                                  <div className="grid grid-cols-3 gap-3">
                                    <input
                                      type="date"
                                      value={aula.data || ''}
                                      onChange={e => updateAula(etapaIdx, aulaIdx, 'data', e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-white text-sm outline-none"
                                    />
                                    <select
                                      value={aula.tipo}
                                      onChange={e => updateAula(etapaIdx, aulaIdx, 'tipo', e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-white text-sm outline-none"
                                    >
                                      <option value="aula">Aula</option>
                                      <option value="prova">Prova</option>
                                      <option value="trabalho">Trabalho</option>
                                      <option value="revisao">Revisão</option>
                                      <option value="recesso">Recesso/Folga</option>
                                    </select>
                                    <input
                                      type="text"
                                      value={aula.titulo || ''}
                                      onChange={e => updateAula(etapaIdx, aulaIdx, 'titulo', e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-white text-sm outline-none"
                                      placeholder="Título"
                                    />
                                  </div>
                                  <textarea
                                    value={aula.conteudo || ''}
                                    onChange={e => updateAula(etapaIdx, aulaIdx, 'conteudo', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-white text-sm outline-none resize-none"
                                    rows={3}
                                    placeholder="Conteúdo da aula..."
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setEditingAula(null)}
                                      className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium cursor-pointer"
                                    >
                                      Concluir edição
                                    </button>
                                    <button
                                      onClick={() => removeAula(etapaIdx, aulaIdx)}
                                      className="px-4 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* View mode */
                                <div>
                                  <div
                                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                                    onClick={() => toggleAula(etapaIdx, aulaIdx)}
                                  >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tipo.badge}`}>
                                      <TipoIcon className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${tipo.text}`}>
                                          {tipo.label} #{aula.numero}
                                        </span>
                                        {aula.data && (
                                          <span className="text-[10px] text-gray-500">
                                            {new Date(aula.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                                          </span>
                                        )}
                                      </div>
                                      <p className="font-medium text-sm text-white truncate">{aula.titulo}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setEditingAula({ etapa: etapaIdx, aula: aulaIdx }); }}
                                        className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                                      </button>
                                      {(aula.conteudo || aula.objetivos?.length > 0 || aula.referencias?.length > 0) && (
                                        isAulaExpanded
                                          ? <ChevronUp className="w-4 h-4 text-gray-500" />
                                          : <ChevronDown className="w-4 h-4 text-gray-500" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Expanded content */}
                                  {isAulaExpanded && (
                                    <div className="px-4 pb-4 pt-0 ml-12 space-y-3 border-t border-white/5">
                                      {aula.conteudo && (
                                        <div className="pt-3">
                                          <p className="text-xs text-gray-300 leading-relaxed">{aula.conteudo}</p>
                                        </div>
                                      )}

                                      {aula.objetivos?.length > 0 && (
                                        <div>
                                          <div className="flex items-center gap-1.5 mb-2">
                                            <Target className="w-3 h-3 text-primary-400" />
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">Objetivos</p>
                                          </div>
                                          <ul className="space-y-1.5">
                                            {aula.objetivos.map((obj, i) => (
                                              <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                                                <span className="text-primary-500 mt-1">•</span>
                                                <span>{obj}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {aula.referencias?.length > 0 && (
                                        <div>
                                          <div className="flex items-center gap-1.5 mb-2">
                                            <BookMarked className="w-3 h-3 text-gray-400" />
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Referências</p>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                            {aula.referencias.map((ref, i) => (
                                              <span key={i} className="text-[10px] bg-dark-700 border border-dark-500 text-gray-400 px-2.5 py-1 rounded-lg">{ref}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div className="pt-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setEditingAula({ etapa: etapaIdx, aula: aulaIdx }); }}
                                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-400 transition-colors cursor-pointer"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                          Editar esta aula
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-center">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-dark-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-dark-600 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerar plano
                </button>
              </div>
            </div>
          )}

          {/* Fallback: raw AI output when structured parsing fails */}
          {displayPlan?.raw && !displayPlan?.plano?.etapas && (
            <FormattedRawContent raw={displayPlan.raw} />
          )}
        </div>
      )}

      {/* Step 4: Planos Salvos */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-dark-800 p-6 rounded-2xl border border-dark-600">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary-500" />
                Planos de Aula Salvos
              </h2>
              <button
                onClick={() => listSavedPlans()}
                className="px-4 py-2 bg-dark-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-dark-600 cursor-pointer"
              >
                Atualizar lista
              </button>
            </div>

            {savedPlans.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-dark-100 mx-auto mb-4" />
                <p className="text-dark-100 text-sm">Nenhum plano salvo ainda.</p>
                <p className="text-dark-100 text-xs mt-1">Gere e salve um plano na aba &quot;Gerar Plano&quot;.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedPlans.map((plan, idx) => (
                  <div
                    key={plan._id || idx}
                    className="bg-dark-700 p-4 rounded-xl border border-dark-500 hover:border-primary-600/50 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {plan.plano?.titulo || plan.titulo || 'Plano sem título'}
                        </h3>
                        {plan.plano?.ementa && (
                          <p className="text-sm text-dark-100 mt-1 line-clamp-2">{plan.plano.ementa}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {(plan.updatedAt || plan.createdAt) && (
                            <span className="text-xs text-dark-100">
                              {new Date(plan.updatedAt || plan.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {plan.plano?.etapas && (
                            <span className="text-xs text-primary-400">
                              {plan.plano.etapas.length} {plan.plano.etapas.length === 1 ? 'etapa' : 'etapas'} · {plan.plano.etapas.reduce((sum, e) => sum + (e.aulas?.length || 0), 0)} aulas
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => { loadSavedPlan(plan); setStep(3); }}
                        className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Carregar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
