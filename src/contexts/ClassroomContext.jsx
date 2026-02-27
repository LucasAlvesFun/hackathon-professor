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

  const saveLessonPlan = useCallback(async (plan) => {
    setLessonPlan(plan);
    const userId = user?.username || 'anonymous';
    const planId = `plan_${userId}_${Date.now()}`;
    try {
      // Save as current plan (for quick load)
      await dbUpsert('lesson_plans', `current_${userId}`, { ...plan, userId, updatedAt: new Date().toISOString() });
      // Also save a historical copy
      await dbPost('lesson_plans', { _id: planId, ...plan, userId, createdAt: new Date().toISOString() });
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
        setLessonPlan(data[0]);
        return data[0];
      }
      // Fallback: load any plan from this user
      const allData = await dbGet('lesson_plans', `userId=${userId}`);
      if (allData && allData.length > 0) {
        setLessonPlan(allData[0]);
        return allData[0];
      }
    } catch { /* ignore */ }
    return null;
  }, [user]);

  const listSavedPlans = useCallback(async () => {
    try {
      const userId = user?.username || 'anonymous';
      const data = await dbGet('lesson_plans', `userId=${userId}`);
      const plans = Array.isArray(data) ? data.filter(p => !p._id?.startsWith('current_')) : [];
      setSavedPlans(plans);
      return plans;
    } catch {
      setSavedPlans([]);
      return [];
    }
  }, [user]);

  const loadSavedPlan = useCallback(async (plan) => {
    setLessonPlan(plan);
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
