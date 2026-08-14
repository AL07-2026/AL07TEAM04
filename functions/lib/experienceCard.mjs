import { GEMINI_FLASH_MODEL, GeminiClientError, createGeminiClient, mapGeminiError } from './gemini.mjs';
import { createExperienceCardPrompt, experienceCardSystemInstruction } from './experienceCardPrompt.mjs';
import { normalizeInterviewRequest } from './interviewQuestion.mjs';

const stringArraySchema = {
  type: 'array',
  items: { type: 'string' },
};

const experienceCardSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    problem: { type: 'string' },
    role: { type: 'string' },
    action: { type: 'string' },
    result: { type: 'string' },
    skills: stringArraySchema,
    jobKeywords: stringArraySchema,
  },
  required: ['title', 'problem', 'role', 'action', 'result', 'skills', 'jobKeywords'],
};

function normalizeNullableText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value, maxLength) {
  if (!Array.isArray(value)) {
    throw new GeminiClientError(502, 'invalid_structured_output', 'Gemini returned an invalid array.');
  }

  return [...new Set(value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))].slice(
    0,
    maxLength,
  );
}

function validateExperienceCard(value) {
  if (!value || typeof value !== 'object') {
    throw new GeminiClientError(502, 'invalid_structured_output', 'Gemini returned invalid card JSON.');
  }

  const title = normalizeText(value.title);
  if (!title) {
    throw new GeminiClientError(502, 'empty_title', 'Gemini returned an empty title.');
  }

  return {
    title,
    problem: normalizeNullableText(value.problem),
    role: normalizeNullableText(value.role),
    action: normalizeNullableText(value.action),
    result: normalizeNullableText(value.result),
    skills: normalizeStringArray(value.skills, 6),
    jobKeywords: normalizeStringArray(value.jobKeywords, 5),
  };
}

function validateExperienceCardRequest(body) {
  const request = normalizeInterviewRequest(body);
  const validHistory = request.history.filter((item) => item.answer.trim());

  if (!validHistory.length) {
    throw new GeminiClientError(400, 'missing_history', 'At least one interview answer is required.');
  }

  return {
    selectedFields: request.selectedFields,
    history: validHistory,
  };
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

const cardQuestionTargets = [
  { target: 'action', pattern: /(행동 부분|직접|행동|해결하기 위해|잘해내기 위해|무엇을 했|어떻게 했|실행|바꾼)/ },
  { target: 'result', pattern: /(결과 부분|결과|달라진|얻은|좋아졌|성과|변화|어땠)/ },
  { target: 'role', pattern: /(역할 부분|역할|담당|맡았던|맡은|자신 있게|잘하는|잘해오신)/ },
  { target: 'problem', pattern: /(문제 부분|어려|어려운 상황|힘들|해결해야 했던|노출이 안|안되는 상황|마주했던)/ },
];

function getTargetedAnswers(history) {
  return history.reduce(
    (acc, item) => {
      const matched = cardQuestionTargets.find(({ pattern }) => pattern.test(item.question));
      if (matched && item.answer.trim()) {
        acc[matched.target].push(item.answer.trim());
      }
      return acc;
    },
    {
      problem: [],
      role: [],
      action: [],
      result: [],
    },
  );
}

function compactText(value) {
  if (!value) return null;
  return value
    .replace(/^(제가|저는|저희는)\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.。]+$/g, '')
    .trim();
}

function createFallbackExperienceCard(request) {
  const combinedAnswers = request.history.map((item) => item.answer).join(' ');
  const targetedAnswers = getTargetedAnswers(request.history);
  const titleBase = request.selectedFields.join('·');
  const problem = compactText(targetedAnswers.problem.at(-1)) ??
    (includesAny(combinedAnswers, [/문제/, /어려/, /힘들/, /지연/, /반복/, /불편/, /이슈/, /노출이 안/])
    ? combinedAnswers.match(/[^.?!]*(문제|어려|힘들|지연|반복|불편|이슈)[^.?!]*/)?.[0]?.trim()
    : null);
  const role = compactText(targetedAnswers.role.at(-1)) ??
    (includesAny(combinedAnswers, [/담당/, /맡/, /책임/, /주도/, /제작/, /기획/, /영업/, /방문/, /계약/])
    ? combinedAnswers.match(/[^.?!]*(담당|맡|책임|주도|영업|방문|계약)[^.?!]*/)?.[0]?.trim()
    : null);
  const action = compactText(targetedAnswers.action.at(-1)) ??
    (includesAny(combinedAnswers, [/바꿨/, /변경/, /개선/, /도입/, /만들/, /공유/, /조율/, /유도/, /방문/, /계약/, /기획/, /올리/, /진행/, /실행/])
    ? combinedAnswers.match(/[^.?!]*(바꿨|변경|개선|도입|만들|공유|조율|유도|방문|계약|기획|올리|진행|실행)[^.?!]*/)?.[0]?.trim()
    : null);
  const result = compactText(targetedAnswers.result.at(-1)) ??
    (includesAny(combinedAnswers, [/좋아졌/, /줄었/, /늘었/, /안정/, /성과/, /달라졌/, /효과/, /매출/, /성사/, /전환/, /노출.*늘/])
    ? combinedAnswers.match(/[^.?!]*(좋아졌|줄었|늘었|안정|성과|달라졌|효과|매출|성사|전환|노출.*늘)[^.?!]*/)?.[0]?.trim()
    : null);
  const inferredSkills = [
    ...request.selectedFields,
    /일정|납기|생산/.test(combinedAnswers) ? '일정관리' : '',
    /생산/.test(combinedAnswers) ? '생산관리' : '',
    /부서|공유|협업|조율/.test(combinedAnswers) ? '부서 협업' : '',
    /고객|영업|계약|방문|상담/.test(combinedAnswers) ? '고객 커뮤니케이션' : '',
    /쇼츠|영상|광고|마케팅/.test(combinedAnswers) ? '콘텐츠 마케팅' : '',
    /광고|노출|매출/.test(combinedAnswers) ? '광고 운영' : '',
    /바꿨|변경|개선|정리|도입/.test(combinedAnswers) ? '업무 개선' : '',
  ].filter(Boolean);
  const inferredKeywords = [
    ...request.selectedFields.map((field) => `${field}관리`),
    /생산|납기|일정/.test(combinedAnswers) ? '생산관리' : '',
    /영업|고객|계약/.test(combinedAnswers) ? '영업관리' : '',
    /쇼츠|영상|광고|마케팅/.test(combinedAnswers) ? '콘텐츠 마케팅' : '',
    /광고|노출|매출/.test(combinedAnswers) ? '광고 운영' : '',
    /프로세스|방식|개선|변경/.test(combinedAnswers) ? '프로세스 개선' : '',
  ].filter(Boolean);
  const skills = [...new Set(inferredSkills)].slice(0, 6);
  const jobKeywords = [...new Set(inferredKeywords)].slice(0, 5);
  const shortProblem = problem?.replace(/(문제가|문제는|문제)/, '문제').replace(/됐습니다|했습니다|있었습니다/g, '').trim();

  return {
    title: shortProblem ? `${shortProblem} 개선` : `${titleBase} 강점 경험 정리`,
    problem,
    role,
    action,
    result,
    skills,
    jobKeywords,
  };
}

function fillCardGapsFromHistory(card, request) {
  const fallback = createFallbackExperienceCard(request);

  return {
    ...card,
    title: fallback.problem ? fallback.title : card.title,
    problem: fallback.problem ?? card.problem,
    role: fallback.role ?? card.role,
    action: fallback.action ?? card.action,
    result: card.result ?? fallback.result,
    skills: card.skills.length ? card.skills : fallback.skills,
    jobKeywords: card.jobKeywords.length ? card.jobKeywords : fallback.jobKeywords,
  };
}

export async function generateExperienceCard(body) {
  const request = validateExperienceCardRequest(body);

  let client;
  try {
    client = createGeminiClient();
  } catch (error) {
    if (error instanceof GeminiClientError) throw error;
    throw new GeminiClientError(500, 'gemini_client_error', 'Failed to initialize Gemini client.', error);
  }

  try {
    const interaction = await client.interactions.create({
      model: GEMINI_FLASH_MODEL,
      input: createExperienceCardPrompt(request),
      system_instruction: experienceCardSystemInstruction,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: experienceCardSchema,
      },
      generation_config: {
        temperature: 0.1,
        max_output_tokens: 1200,
        thinking_level: 'minimal',
      },
    });

    const text = interaction.output_text?.trim();
    if (!text) {
      throw new GeminiClientError(502, 'empty_response', 'Gemini API returned an empty response.');
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new GeminiClientError(502, 'invalid_structured_output', 'Gemini returned malformed JSON.', error);
    }

    return fillCardGapsFromHistory(validateExperienceCard(parsed), request);
  } catch (error) {
    const mappedError = error instanceof GeminiClientError ? error : mapGeminiError(error);

    if (
      ['rate_limited', 'network_error', 'model_unavailable', 'empty_response', 'invalid_structured_output', 'gemini_api_error'].includes(
        mappedError.code,
      )
    ) {
      console.warn('Using fallback experience card after Gemini failure:', {
        code: mappedError.code,
        status: mappedError.status,
      });
      return createFallbackExperienceCard(request);
    }

    throw mappedError;
  }
}
