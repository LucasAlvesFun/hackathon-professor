import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function callGemini(prompt, options = {}) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
    },
  });
  return response.text || '';
}

export async function queryGemini(prompt, context = '') {
  const fullPrompt = context
    ? `Contexto:\n${context}\n\nPergunta/Instrução:\n${prompt}`
    : prompt;
  return callGemini(fullPrompt);
}

export async function processNotebookLM(filesContent) {
  const prompt = `Você é um assistente acadêmico especializado. Analise o seguinte conteúdo educacional e extraia:
1. Tópicos principais e subtópicos
2. Conceitos-chave
3. Sequência lógica de aprendizado
4. Referências bibliográficas mencionadas

Conteúdo:
${filesContent}

Responda em formato JSON estruturado com as chaves: topicos, conceitos, sequencia, referencias.`;
  const result = await callGemini(prompt);
  try {
    const jsonMatch = result.match(/```json\n?([\s\S]*?)```/) || result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
  } catch {
    // fallback
  }
  return { raw: result };
}

export async function generateLessonPlan(structuredContext) {
  const prompt = `Você é um especialista em planejamento educacional. Com base nas informações abaixo, gere um plano de aula detalhado.

Informações:
- Nível de ensino: ${structuredContext.nivel}
- Curso: ${structuredContext.curso}
- Disciplina: ${structuredContext.disciplina}
- Objetivo geral: ${structuredContext.objetivo}
- Estrutura: ${structuredContext.estrutura} (${structuredContext.subdivisao})
- Aulas por semana: ${structuredContext.aulasPorSemana}
- Duração de cada aula: ${structuredContext.duracaoAula} minutos
- Número de provas por etapa: ${structuredContext.provasPorEtapa}
- Número de trabalhos por etapa: ${structuredContext.trabalhosPorEtapa}
- Data início: ${structuredContext.dataInicio}
- Data fim: ${structuredContext.dataFim}
${structuredContext.perfilTurma ? `- Perfil da turma: ${structuredContext.perfilTurma}` : ''}
${structuredContext.insightsProfessor ? `- Ideias/insights do professor sobre como ensinar: ${structuredContext.insightsProfessor}` : ''}
${structuredContext.topicosExtraidos ? `- Tópicos extraídos do material: ${JSON.stringify(structuredContext.topicosExtraidos)}` : ''}
${structuredContext.conteudoExtra ? `- Conteúdo adicional: ${structuredContext.conteudoExtra}` : ''}

IMPORTANTE: Responda SOMENTE com o JSON abaixo, sem nenhum texto antes ou depois. Não inclua explicações, introduções ou comentários.

Formato JSON obrigatório:
{
  "plano": {
    "titulo": "string",
    "ementa": "string",
    "etapas": [
      {
        "nome": "string",
        "aulas": [
          {
            "numero": number,
            "data": "YYYY-MM-DD",
            "tipo": "aula" | "prova" | "trabalho" | "revisao" | "recesso",
            "titulo": "string",
            "conteudo": "string (máximo 2 frases)",
            "objetivos": ["string (máximo 3 objetivos)"],
            "referencias": ["string (máximo 2 referências curtas)"]
          }
        ]
      }
    ]
  }
}

Regras:
- Distribua os conteúdos de forma lógica e progressiva.
- Inclua aulas de revisão antes de provas.
- Seja CONCISO no conteúdo e objetivos para manter o JSON compacto.
- Se o perfil da turma e/ou insights do professor forem fornecidos, adapte o plano conforme indicado.`;

  const result = await callGemini(prompt, { maxOutputTokens: 65536, responseMimeType: 'application/json' });
  try {
    // Clean up - remove code fences
    let text = result.replace(/```(?:json)?\s*\n?/g, '').replace(/```/g, '').trim();
    
    // Try direct parse
    try {
      const direct = JSON.parse(text);
      if (direct?.plano?.etapas) return direct;
      if (direct?.etapas) return { plano: direct };
    } catch { /* try substring */ }

    // Find first { to last } (most inclusive JSON block)
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = text.substring(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed?.plano?.etapas) return parsed;
        if (parsed?.titulo && parsed?.etapas) return { plano: parsed };
        if (parsed?.etapas) return { plano: parsed };
        return parsed;
      } catch { /* fallback */ }
    }
  } catch {
    // fallback
  }
  return { raw: result };
}

export async function analyzeClassroom(data) {
  const prompt = `Você é um analista educacional especialista em identificação de padrões comportamentais em sala de aula. Analise os dados da turma abaixo com atenção especial para os "alunos invisíveis".

## O que são ALUNOS INVISÍVEIS?
Alunos invisíveis NÃO são alunos em risco claro. São alunos que:
- Têm notas medianas (entre 5.0 e 7.5) — não são os piores, mas também não se destacam
- Têm frequência razoável (entre 70% e 85%) — comparecem, mas sem consistência total
- Não geram alertas óbvios porque não estão reprovando
- Não participam ativamente, não fazem perguntas, não interagem com colegas
- Podem estar desmotivados, com problemas pessoais ou simplesmente "passando despercebidos"
- São os alunos que o professor provavelmente não lembra de mencionar quando fala da turma
- Critério chave: a COMBINAÇÃO de desempenho mediano + falta de destaque (positivo ou negativo)

Para cada aluno invisível identificado, explique brevemente POR QUE ele é considerado invisível.

## Análise completa solicitada:
1. **Alunos invisíveis**: identifique usando os critérios acima. Inclua o motivo para cada um.
2. **Alunos em risco**: notas abaixo da média mínima OU frequência abaixo de 75%
3. **Insights**: padrões importantes identificados na turma
4. **Sugestões proativas**: ações concretas e específicas para o professor

Dados da turma:
${JSON.stringify(data, null, 2)}

Responda em JSON:
{
  "alunosInvisiveis": [{ "_id": "string", "motivo": "string" }],
  "alunosEmRisco": [{ "_id": "string", "motivo": "string" }],
  "insights": ["string"],
  "sugestoes": ["string"],
  "mediaGeral": number,
  "frequenciaMedia": number
}`;

  const result = await callGemini(prompt);
  try {
    const jsonMatch = result.match(/```json\n?([\s\S]*?)```/) || result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
  } catch {
    // fallback
  }
  return { raw: result };
}

export async function chatWithTeacher(message, classroomContext) {
  const prompt = `Você é o EduPilot AI, assistente inteligente de um professor. Responda de forma útil, empática e profissional.

Contexto da turma:
${classroomContext ? JSON.stringify(classroomContext, null, 2) : 'Sem dados de turma ainda.'}

Mensagem do professor:
${message}

Responda de forma clara e objetiva em português brasileiro. Se a pergunta for sobre dados específicos da turma, use os dados fornecidos no contexto.`;

  return callGemini(prompt);
}
