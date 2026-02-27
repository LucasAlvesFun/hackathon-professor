import { useEffect, useState } from 'react';
import { useClassroom } from '../contexts/ClassroomContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Users, X, Plus, Upload, Thermometer, BookOpen, Clock, Award, FileText, Edit3, Save, Check, Loader2 } from 'lucide-react';

function getThermometerColor(score) {
  if (score >= 80) return { bar: 'bg-green-400', bg: 'bg-green-100', ring: 'ring-green-300', text: 'text-green-700', label: 'Ótimo' };
  if (score >= 60) return { bar: 'bg-amber-400', bg: 'bg-amber-100', ring: 'ring-amber-300', text: 'text-amber-700', label: 'Atenção' };
  return { bar: 'bg-red-400', bg: 'bg-red-100', ring: 'ring-red-300', text: 'text-red-700', label: 'Risco' };
}

function calculateScore(student) {
  const extra = student.extra || {};
  const provas = Object.entries(extra).filter(([k]) => k.startsWith('prova')).map(([, v]) => Number(v));
  const trabalhos = Object.entries(extra).filter(([k]) => k.startsWith('trabalho')).map(([, v]) => Number(v));
  const allGrades = [...provas, ...trabalhos];
  const mediaNotas = allGrades.length > 0 ? (allGrades.reduce((a, b) => a + b, 0) / allGrades.length) * 10 : 50;
  const freq = Number(extra.frequencia || 50);
  return Math.round((mediaNotas * 0.6 + freq * 0.4));
}

function StudentCard({ student, onClick }) {
  const score = calculateScore(student);
  const therm = getThermometerColor(score);
  const initials = (student.name || student._id || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={() => onClick(student)}
      className={`bg-dark-700 p-4 rounded-2xl border border-dark-500 hover:border-primary-600/50 transition-all flex flex-col items-center gap-2 cursor-pointer group`}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white ring-3 ${therm.ring} ${
        score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'
      } group-hover:scale-105 transition-transform`}>
        {initials}
      </div>
      <p className="text-xs font-medium text-gray-300 truncate max-w-full">{student.name || student._id}</p>
      {/* Thermometer */}
      <div className="flex items-center gap-2 w-full">
        <div className={`flex-1 h-2 rounded-full ${therm.bg}`}>
          <div
            className={`h-full rounded-full ${therm.bar} transition-all`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
        <span className={`text-[10px] font-bold ${therm.text}`}>{score}%</span>
      </div>
    </button>
  );
}

function StudentModal({ student, onClose, courseConfig, onUpdateStudent }) {
  if (!student) return null;

  const extra = student.extra || {};
  const provas = Object.entries(extra).filter(([k]) => k.startsWith('prova')).sort();
  const trabalhos = Object.entries(extra).filter(([k]) => k.startsWith('trabalho')).sort();
  const freq = extra.frequencia;
  const score = calculateScore(student);
  const therm = getThermometerColor(score);

  const mediaMinima = courseConfig?.mediaMinima || 7;
  const freqMinima = courseConfig?.frequenciaMinima || 75;

  const mediaNotas = [...provas, ...trabalhos].map(([, v]) => Number(v));
  const media = mediaNotas.length > 0 ? (mediaNotas.reduce((a, b) => a + b, 0) / mediaNotas.length).toFixed(1) : '—';

  // ── Editing state ──
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFreq, setEditFreq] = useState(freq || '');
  const [editProvas, setEditProvas] = useState(
    provas.length > 0 ? provas.map(([k, v]) => ({ key: k, value: v })) : []
  );
  const [editTrabalhos, setEditTrabalhos] = useState(
    trabalhos.length > 0 ? trabalhos.map(([k, v]) => ({ key: k, value: v })) : []
  );

  const addProva = () => {
    const num = editProvas.length + 1;
    setEditProvas(prev => [...prev, { key: `prova${num}`, value: '' }]);
  };

  const addTrabalho = () => {
    const num = editTrabalhos.length + 1;
    setEditTrabalhos(prev => [...prev, { key: `trabalho${num}`, value: '' }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newExtra = {};
      if (editFreq !== '') newExtra.frequencia = Number(editFreq);
      editProvas.forEach(({ key, value }) => {
        if (value !== '') newExtra[key] = Number(value);
      });
      editTrabalhos.forEach(({ key, value }) => {
        if (value !== '') newExtra[key] = Number(value);
      });
      await onUpdateStudent(student._id, newExtra);
      setEditing(false);
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-dark-600 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white ${
              score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'
            }`}>
              {(student.name || student._id || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{student.name || student._id}</h2>
              <p className="text-sm text-dark-100">Matrícula: {student._id}</p>
              {student.email && <p className="text-sm text-dark-100">{student.email}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="p-2 hover:bg-primary-600/20 rounded-xl transition-colors cursor-pointer" title="Editar notas e frequência">
                <Edit3 className="w-5 h-5 text-primary-600" />
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 cursor-pointer">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-dark-600 rounded-xl transition-colors cursor-pointer">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Score */}
          <div className="flex items-center gap-4">
            <Thermometer className={`w-6 h-6 ${therm.text}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-300">Score de Engajamento</span>
                <span className={`text-sm font-bold ${therm.text}`}>{score}% — {therm.label}</span>
              </div>
              <div className={`h-3 rounded-full ${therm.bg}`}>
                <div className={`h-full rounded-full ${therm.bar} transition-all`} style={{ width: `${score}%` }} />
              </div>
            </div>
          </div>

          {/* Frequência */}
          <div className="bg-dark-700 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-dark-100" />
              <span className="text-sm font-medium text-gray-300">Frequência</span>
            </div>
            {editing ? (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editFreq}
                  onChange={e => setEditFreq(e.target.value)}
                  className="w-24 px-3 py-2 rounded-lg border border-dark-500 bg-dark-800 text-white text-sm outline-none focus:border-primary-500 text-center font-bold text-lg"
                  placeholder="0"
                />
                <span className="text-sm text-dark-100">%</span>
                <span className="text-xs text-dark-100">Mínimo: {freqMinima}%</span>
              </div>
            ) : freq ? (
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold ${Number(freq) >= freqMinima ? 'text-green-600' : 'text-red-500'}`}>
                  {freq}%
                </span>
                <span className="text-xs text-dark-100">Mínimo: {freqMinima}%</span>
                {Number(freq) < freqMinima && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Abaixo do mínimo</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-dark-100">Sem dados de frequência</p>
            )}
          </div>

          {/* Provas */}
          <div className="bg-dark-700 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-dark-100" />
                <span className="text-sm font-medium text-gray-300">Notas de Provas</span>
              </div>
              {editing && (
                <button onClick={addProva} className="flex items-center gap-1 px-2 py-1 bg-primary-600/20 text-primary-500 rounded-lg text-xs font-medium hover:bg-primary-600/30 cursor-pointer">
                  <Plus className="w-3 h-3" />
                  Prova
                </button>
              )}
            </div>
            {editing ? (
              <div className="grid grid-cols-2 gap-2">
                {editProvas.map((p, i) => (
                  <div key={p.key} className="bg-dark-600 p-3 rounded-lg border border-dark-500">
                    <p className="text-xs text-dark-100 capitalize mb-1">{p.key.replace('prova', 'Prova ')}</p>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={p.value}
                      onChange={e => {
                        const updated = [...editProvas];
                        updated[i].value = e.target.value;
                        setEditProvas(updated);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-dark-500 bg-dark-800 text-white text-sm outline-none focus:border-primary-500 text-center font-bold text-lg"
                      placeholder="0.0"
                    />
                  </div>
                ))}
                {editProvas.length === 0 && (
                  <p className="text-sm text-dark-100 col-span-2">Clique em "+ Prova" para adicionar</p>
                )}
              </div>
            ) : provas.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {provas.map(([key, value]) => (
                  <div key={key} className="bg-dark-600 p-3 rounded-lg border border-dark-500">
                    <p className="text-xs text-dark-100 capitalize">{key.replace('prova', 'Prova ')}</p>
                    <p className={`text-xl font-bold ${Number(value) >= mediaMinima ? 'text-green-600' : 'text-red-500'}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-100">Nenhuma prova registrada</p>
            )}
          </div>

          {/* Trabalhos */}
          <div className="bg-dark-700 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-dark-100" />
                <span className="text-sm font-medium text-gray-300">Notas de Trabalhos</span>
              </div>
              {editing && (
                <button onClick={addTrabalho} className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 cursor-pointer">
                  <Plus className="w-3 h-3" />
                  Trabalho
                </button>
              )}
            </div>
            {editing ? (
              <div className="grid grid-cols-2 gap-2">
                {editTrabalhos.map((t, i) => (
                  <div key={t.key} className="bg-dark-600 p-3 rounded-lg border border-dark-500">
                    <p className="text-xs text-dark-100 capitalize mb-1">{t.key.replace('trabalho', 'Trabalho ')}</p>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={t.value}
                      onChange={e => {
                        const updated = [...editTrabalhos];
                        updated[i].value = e.target.value;
                        setEditTrabalhos(updated);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-dark-500 bg-dark-800 text-white text-sm outline-none focus:border-primary-500 text-center font-bold text-lg"
                      placeholder="0.0"
                    />
                  </div>
                ))}
                {editTrabalhos.length === 0 && (
                  <p className="text-sm text-dark-100 col-span-2">Clique em "+ Trabalho" para adicionar</p>
                )}
              </div>
            ) : trabalhos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {trabalhos.map(([key, value]) => (
                  <div key={key} className="bg-dark-600 p-3 rounded-lg border border-dark-500">
                    <p className="text-xs text-dark-100 capitalize">{key.replace('trabalho', 'Trabalho ')}</p>
                    <p className={`text-xl font-bold ${Number(value) >= mediaMinima ? 'text-green-600' : 'text-red-500'}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-100">Nenhum trabalho registrado</p>
            )}
          </div>

          {/* Média */}
          <div className="bg-primary-600/10 p-4 rounded-xl border border-primary-600/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-bold text-primary-400">Média Geral</span>
            </div>
            <span className={`text-2xl font-bold ${Number(media) >= mediaMinima ? 'text-green-600' : 'text-red-500'}`}>
              {media}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Alunos() {
  const { students, fetchStudents, addStudent, updateStudentData, courseConfig, loading } = useClassroom();
  const { addNotification } = useNotifications();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ _id: '', name: '', email: '' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    try {
      await addStudent({
        _id: newStudent._id,
        name: newStudent.name,
        email: newStudent.email || `${newStudent._id}@escola.com`,
        extra: { frequencia: 100 },
      });
      setNewStudent({ _id: '', name: '', email: '' });
      setShowAddModal(false);
      addNotification({ type: 'info', title: 'Aluno adicionado', message: `${newStudent.name} foi adicionado à turma.` });
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateStudent = async (studentId, extraData) => {
    await updateStudentData(studentId, extraData);
    // Refresh the selected student with new data
    const updated = students.find(s => s._id === studentId);
    if (updated) {
      setSelectedStudent({ ...updated, extra: { ...(updated.extra || {}), ...extraData } });
    }
    addNotification({ type: 'info', title: 'Dados atualizados', message: 'Notas e frequência salvos com sucesso.' });
    await fetchStudents();
  };

  const handleCSVImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/[,;]/).map(p => p.trim());
        if (parts.length >= 2) {
          try {
            await addStudent({
              _id: parts[0],
              name: parts[1],
              email: parts[2] || `${parts[0]}@escola.com`,
              extra: { frequencia: 100 },
            });
          } catch { /* skip duplicates */ }
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Sala de Aula</h1>
          <p className="text-dark-100 mt-1">Mapa visual dos alunos — clique para ver detalhes</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-dark-600 text-gray-300 rounded-xl text-sm font-medium hover:bg-dark-500 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Importar CSV
            <input type="file" accept=".csv,.xlsx" onChange={handleCSVImport} className="hidden" />
          </label>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Aluno
          </button>
        </div>
      </div>

      {loading && students.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-dark-100">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>Carregando alunos...</p>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-dark-100">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-dark-100">Nenhum aluno na turma</p>
            <p className="text-sm mt-1">Adicione alunos manualmente ou importe um CSV</p>
          </div>
        </div>
      ) : (
        /* Grid simulando cadeiras na sala */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {students.map(student => (
            <StudentCard key={student._id} student={student} onClick={setSelectedStudent} />
          ))}
        </div>
      )}

      {/* Modal Detalhe do Aluno */}
      {selectedStudent && (
        <StudentModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          courseConfig={courseConfig}
          onUpdateStudent={handleUpdateStudent}
        />
      )}

      {/* Modal Adicionar Aluno */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-dark-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-dark-600 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Adicionar Aluno</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-dark-600 rounded-xl cursor-pointer">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{addError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Matrícula / ID</label>
                <input
                  type="text"
                  value={newStudent._id}
                  onChange={e => setNewStudent(p => ({ ...p, _id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-600/30 outline-none text-sm"
                  placeholder="Ex: 2024001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome completo</label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={e => setNewStudent(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-600/30 outline-none text-sm"
                  placeholder="Nome do aluno"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email (opcional)</label>
                <input
                  type="email"
                  value={newStudent.email}
                  onChange={e => setNewStudent(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-600/30 outline-none text-sm"
                  placeholder="aluno@escola.com"
                />
              </div>
              <button
                type="submit"
                disabled={addLoading}
                className="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {addLoading ? 'Adicionando...' : 'Adicionar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
