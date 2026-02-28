import { createContext, useContext, useState, useCallback } from 'react';
import { listPlayers, createPlayer, updatePlayer, dbUpsert, dbGet, dbPost } from '../services/api';
import { useAuth } from './AuthContext';

const ClassroomContext = createContext(null);

export function ClassroomProvider({ children }) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [lessonPlan, setLessonPlan] = useState(null);
  const [courseConfig, setCourseConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPlayers();
      const all = Array.isArray(data) ? data : [];
      // Filter out professors — only show students
      const onlyStudents = all.filter(p => p.extra?.role !== 'professor');
      setStudents(onlyStudents);
      return onlyStudents;
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addStudent = useCallback(async (student) => {
    try {
      const payload = {
        ...student,
        extra: { ...student.extra, role: 'aluno' },
      };
      const result = await createPlayer(payload);
      setStudents(prev => [...prev, result]);
      return result;
    } catch (err) {
      console.error('Erro ao adicionar aluno:', err);
      throw err;
    }
  }, []);

  const updateStudentData = useCallback(async (studentId, extraData) => {
    try {
      const student = students.find(s => s._id === studentId);
      if (!student) throw new Error('Aluno não encontrado');
      const newExtra = { ...(student.extra || {}), ...extraData };
      const result = await updatePlayer(studentId, { extra: newExtra });
      setStudents(prev => prev.map(s => s._id === studentId ? { ...s, extra: newExtra } : s));
      return result;
    } catch (err) {
      console.error('Erro ao atualizar aluno:', err);
      throw err;
    }
  }, [students]);

  const saveCourseConfig = useCallback(async (config) => {
    setCourseConfig(config);
    try {
      await dbUpsert('course_config', 'current', config);
    } catch (err) {
      console.error('Erro ao salvar config:', err);
    }
  }, []);

  const loadCourseConfig = useCallback(async () => {
    try {
      const data = await dbGet('course_config');
      if (data && data.length > 0) {
        setCourseConfig(data[0]);
        return data[0];
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  // Normalize plan: ensure .plano exists even if stored as .raw
  const normalizePlan = useCallback((plan) => {
    if (!plan) return null;
    if (plan.plano?.etapas) return plan;
    if (plan.raw) {
      try {
        const text = plan.raw;
        let depth = 0, start = -1, parsed = null;
        for (let i = 0; i < text.length; i++) {
          if (text[i] === '{') { if (depth === 0) start = i; depth++; }
          else if (text[i] === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
              try { parsed = JSON.parse(text.substring(start, i + 1)); break; } catch { start = -1; }
            }
          }
        }
        if (parsed?.plano?.etapas) return { ...plan, plano: parsed.plano };
        if (parsed?.etapas) return { ...plan, plano: parsed };
      } catch { /* keep as-is */ }
    }
    return plan;
  }, []);

  const saveLessonPlan = useCallback(async (plan) => {
    const normalized = normalizePlan(plan) || plan;
    setLessonPlan(normalized);
    const userId = user?.username || 'anonymous';
    const now = new Date().toISOString();
    const titulo = plan?.plano?.titulo || 'Plano sem título';
    const planId = `plan_${Date.now()}`;
    try {
      // Save as current plan (for quick load)
      await dbUpsert('lesson_plans', `current_${userId}`, { ...plan, userId, titulo, updatedAt: now });
      // Also save a named copy
      await dbPost('lesson_plans', { _id: planId, ...plan, userId, titulo, createdAt: now, updatedAt: now });
      // Refresh saved plans list
      await listSavedPlans();
    } catch (err) {
      console.error('Erro ao salvar plano:', err);
    }
  }, [user]);

  const loadLessonPlan = useCallback(async () => {
    try {
      const userId = user?.username || 'anonymous';
      const data = await dbGet('lesson_plans', `_id=current_${userId}`);
      if (data && data.length > 0) {
        const plan = normalizePlan(data[0]);
        setLessonPlan(plan);
        return plan;
      }
      // Fallback: load any plan from this user
      const allData = await dbGet('lesson_plans', `userId=${userId}`);
      if (allData && allData.length > 0) {
        const plan = normalizePlan(allData[0]);
        setLessonPlan(plan);
        return plan;
      }
    } catch { /* ignore */ }
    return null;
  }, [user]);

  const listSavedPlans = useCallback(async () => {
    try {
      const userId = user?.username || 'anonymous';
      // Fetch all plans for this user
      const data = await dbGet('lesson_plans', `userId=${encodeURIComponent(userId)}`);
      let plans = Array.isArray(data) ? data : [];
      // If query filter didn't work (API returned all), filter client-side
      if (plans.length > 0 && plans.some(p => p.userId && p.userId !== userId)) {
        plans = plans.filter(p => p.userId === userId);
      }
      // If still empty, try fetching all and filtering
      if (plans.length === 0) {
        const allData = await dbGet('lesson_plans');
        plans = Array.isArray(allData) ? allData.filter(p => p.userId === userId) : [];
      }
      // Sort by date (newest first)
      plans.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA;
      });
      setSavedPlans(plans);
      return plans;
    } catch (err) {
      console.error('Erro ao listar planos:', err);
      setSavedPlans([]);
      return [];
    }
  }, [user]);

  const loadSavedPlan = useCallback(async (plan) => {
    const normalized = normalizePlan(plan) || plan;
    setLessonPlan(normalized);
  }, []);

  return (
    <ClassroomContext.Provider value={{
      students, fetchStudents, addStudent, updateStudentData,
      lessonPlan, setLessonPlan, saveLessonPlan, loadLessonPlan,
      savedPlans, listSavedPlans, loadSavedPlan,
      courseConfig, setCourseConfig, saveCourseConfig, loadCourseConfig,
      aiAnalysis, setAiAnalysis,
      loading,
    }}>
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassroom() {
  const ctx = useContext(ClassroomContext);
  if (!ctx) throw new Error('useClassroom must be used within ClassroomProvider');
  return ctx;
}
