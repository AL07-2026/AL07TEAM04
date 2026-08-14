import {
  INTERVIEW_TARGETS,
  MAX_INTERVIEW_QUESTIONS,
  createInterviewPrompt,
  interviewSystemInstruction,
} from './interviewPrompt.mjs';
import { GEMINI_FLASH_MODEL, GeminiClientError, createGeminiClient, mapGeminiError } from './gemini.mjs';

const completeCollected = {
  problem: true,
  role: true,
  action: true,
  result: true,
};

const targetQuestions = {
  opening: (fields) => `${fields.join('이나 ')} 업무 중에서 선생님이 가장 자신 있게 해오신 일은 무엇인가요?`,
  problem: () => '문제 부분을 정리하려고 해요. 그 경험에서 가장 해결해야 했던 문제나 어려움은 무엇이었나요?',
  role: () => '역할 부분을 정리하려고 해요. 그 일에서 선생님이 맡은 역할이나 담당 업무는 무엇이었나요?',
  action: () => '행동 부분을 정리하려고 해요. 그 문제를 해결하려고 선생님이 직접 한 일은 무엇이었나요?',
  result: () => '결과 부분을 정리하려고 해요. 그렇게 한 뒤 실제로 달라진 점이나 얻은 결과는 무엇이었나요?',
};

const targetByQuestionPattern = [
  { target: 'action', pattern: /(행동 부분|직접|실행|바꾸|조치|해결하기 위해|어떻게 하셨|풀기 위해)/ },
  { target: 'result', pattern: /(결과 부분|결과|달라졌|좋아졌|성과|변화|안정|줄었|늘었)/ },
  { target: 'role', pattern: /(역할 부분|역할|책임|맡|담당|자신 있게|잘하는|잘해오신)/ },
  { target: 'problem', pattern: /(문제 부분|어려움|어려웠|힘들|난관|해결해야 했던|마주쳤던 상황)/ },
];

const interviewResponseSchema = {
  type: 'object',
  properties: {
    complete: {
      type: 'boolean',
      description: '인터뷰 완료 여부',
    },
    question: {
      type: 'string',
      description: 'complete가 false일 때 다음 질문, true일 때 빈 문자열',
    },
    target: {
      type: 'string',
      enum: [...INTERVIEW_TARGETS, 'none'],
      description: '이번 질문이 수집하려는 정보',
    },
    collected: {
      type: 'object',
      properties: {
        problem: { type: 'boolean' },
        role: { type: 'boolean' },
        action: { type: 'boolean' },
        result: { type: 'boolean' },
      },
      required: ['problem', 'role', 'action', 'result'],
    },
  },
  required: ['complete', 'question', 'target', 'collected'],
};

function validateSelectedFields(selectedFields) {
  if (!Array.isArray(selectedFields)) {
    throw new GeminiClientError(400, 'invalid_selected_fields', 'selectedFields must be an array.');
  }

  const normalizedFields = selectedFields
    .filter((field) => typeof field === 'string')
    .map((field) => field.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (!normalizedFields.length) {
    throw new GeminiClientError(400, 'missing_selected_fields', 'At least one selected field is required.');
  }

  return normalizedFields;
}

function validateHistory(history) {
  if (!Array.isArray(history)) {
    throw new GeminiClientError(400, 'invalid_history', 'history must be an array.');
  }

  return history.map((item) => {
    const question = typeof item?.question === 'string' ? item.question.trim() : '';
    const answer = typeof item?.answer === 'string' ? item.answer.trim() : '';

    if (!question || !answer) {
      throw new GeminiClientError(400, 'invalid_history_item', 'history items require question and answer.');
    }

    return { question, answer };
  });
}

function getCompleteResponse() {
  return {
    complete: true,
    question: null,
    target: null,
    collected: { ...completeCollected },
  };
}

function detectCollectedFromHistory(history) {
  const combinedAnswers = history.map((item) => item.answer).join('\n');

  return {
    problem: /(문제|어려|난관|쉽지 않|힘들|안되|안 되|지연|반복|불편|이슈|실패|부족|혼선|갈등|위기|막혔|낮았|떨어졌)/.test(combinedAnswers),
    role: /(담당|맡았|맡아|책임|주도|총괄|관리|파트장|팀장|리더|PM|매니저|직접 방문|고객사 영업|상담|계약)/i.test(combinedAnswers),
    action: /(바꿨|변경|개선|도입|만들|정리|공유|조율|설계|진행|실행|교육|관리|제안|유도|방문|상담|계약|올리|해왔|했습니다|했어요)/.test(combinedAnswers),
    result: /(안정|줄었|늘었|좋아졌|해결됐|완료됐|성과|달라졌|개선됐|향상|절감|증가|감소|변화|효과|반응|성사됐|매출|노출|전환|계약.*늘|많이 일으켰)/.test(combinedAnswers),
  };
}

function getAskedTargets(history) {
  return new Set(
    history.flatMap((item) =>
      targetByQuestionPattern.filter(({ pattern }) => pattern.test(item.question)).map(({ target }) => target),
    ),
  );
}

function getAnsweredTargets(history) {
  return new Set(
    history.flatMap((item) =>
      targetByQuestionPattern
        .filter(({ pattern }) => pattern.test(item.question) && item.answer.trim().length >= 3)
        .map(({ target }) => target),
    ),
  );
}

function getMissingAnsweredTargets(history) {
  const answeredTargets = getAnsweredTargets(history);
  return INTERVIEW_TARGETS.filter((target) => !answeredTargets.has(target));
}

function normalizeQuestionForComparison(question) {
  return question.replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

function isSimilarQuestion(question, history) {
  const normalizedQuestion = normalizeQuestionForComparison(question);
  return history.some((item) => {
    const previousQuestion = normalizeQuestionForComparison(item.question);
    if (previousQuestion === normalizedQuestion) return true;

    const sharedKeywords = ['어려움', '해결해야 했던 상황', '자주 마주쳤던', '역할', '책임', '직접', '결과'].filter(
      (keyword) => previousQuestion.includes(keyword) && normalizedQuestion.includes(keyword),
    );

    return sharedKeywords.length >= 2;
  });
}

function chooseNextTarget(collected, history, currentTarget) {
  const missingAnsweredTargets = getMissingAnsweredTargets(history);
  return (
    missingAnsweredTargets.find((target) => target !== currentTarget && !collected[target]) ??
    missingAnsweredTargets.find((target) => target !== currentTarget) ??
    null
  );
}

function preventRepeatedQuestion(result, request) {
  const answeredTargets = getAnsweredTargets(request.history);
  const collected = {
    ...detectCollectedFromHistory(request.history),
    ...result.collected,
    ...Object.fromEntries([...answeredTargets].map((target) => [target, true])),
  };

  if (result.complete) {
    const serverCollected = detectCollectedFromHistory(request.history);
    const missingAnsweredTargets = getMissingAnsweredTargets(request.history);

    if (missingAnsweredTargets.length) {
      const nextTarget = missingAnsweredTargets[0];

      return {
        complete: false,
        question: targetQuestions[nextTarget](request.selectedFields),
        target: nextTarget,
        collected: {
          ...serverCollected,
          ...Object.fromEntries([...answeredTargets].map((target) => [target, true])),
        },
      };
    }

    if (request.history.length >= 2 && INTERVIEW_TARGETS.every((target) => serverCollected[target])) {
      return result;
    }

    const nextTarget = chooseNextTarget(serverCollected, request.history, null);

    return nextTarget
      ? {
          complete: false,
          question: targetQuestions[nextTarget](request.selectedFields),
          target: nextTarget,
          collected: serverCollected,
        }
      : result;
  }

  if (!result.question || !result.target) return result;

  const repeatsTarget = answeredTargets.has(result.target);
  const repeatsQuestion = isSimilarQuestion(result.question, request.history);

  if (!repeatsTarget && !repeatsQuestion) {
    return {
      ...result,
      collected,
    };
  }

  const nextTarget = chooseNextTarget(collected, request.history, result.target);

  if (!nextTarget) {
    return request.history.length >= 2 ? getCompleteResponse() : result;
  }

  return {
    complete: false,
    question: targetQuestions[nextTarget](request.selectedFields),
    target: nextTarget,
    collected,
  };
}

function createFallbackInterviewResponse(request) {
  const answeredTargets = getAnsweredTargets(request.history);
  const collected = {
    ...detectCollectedFromHistory(request.history),
    ...Object.fromEntries([...answeredTargets].map((target) => [target, true])),
  };

  if (!request.history.length) {
    return {
      complete: false,
      question: targetQuestions.opening(request.selectedFields),
      target: 'role',
      collected,
    };
  }

  const nextTarget = chooseNextTarget(collected, request.history, null);

  if (
    request.history.length >= 2 &&
    !getMissingAnsweredTargets(request.history).length &&
    (!nextTarget || INTERVIEW_TARGETS.every((target) => collected[target]))
  ) {
    return getCompleteResponse();
  }

  const target = nextTarget ?? 'result';

  return {
    complete: false,
    question: targetQuestions[target](request.selectedFields),
    target,
    collected,
  };
}

function validateCollected(collected) {
  if (!collected || typeof collected !== 'object') {
    throw new GeminiClientError(502, 'invalid_structured_output', 'Gemini returned invalid collected data.');
  }

  return {
    problem: collected.problem === true,
    role: collected.role === true,
    action: collected.action === true,
    result: collected.result === true,
  };
}

function validateInterviewResponse(value) {
  if (!value || typeof value !== 'object') {
    throw new GeminiClientError(502, 'invalid_structured_output', 'Gemini returned invalid JSON.');
  }

  const complete = value.complete === true;
  const question = typeof value.question === 'string' ? value.question.trim() : '';
  const target = value.target === 'none' ? null : INTERVIEW_TARGETS.includes(value.target) ? value.target : undefined;
  const collected = validateCollected(value.collected);

  if (target === undefined) {
    throw new GeminiClientError(502, 'invalid_structured_output', 'Gemini returned an invalid target.');
  }

  if (complete) {
    return {
      complete: true,
      question: null,
      target: null,
      collected: { ...completeCollected },
    };
  }

  if (!question) {
    throw new GeminiClientError(502, 'empty_question', 'Gemini returned an empty question.');
  }

  if (!target) {
    throw new GeminiClientError(502, 'invalid_structured_output', 'Gemini returned no target for a question.');
  }

  return {
    complete: false,
    question,
    target,
    collected,
  };
}

export function normalizeInterviewRequest(body) {
  return {
    selectedFields: validateSelectedFields(body?.selectedFields),
    history: validateHistory(body?.history ?? []),
  };
}

export async function generateNextInterviewQuestion(body) {
  const request = normalizeInterviewRequest(body);

  if (request.history.length >= MAX_INTERVIEW_QUESTIONS) {
    return getCompleteResponse();
  }

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
      input: createInterviewPrompt(request),
      system_instruction: interviewSystemInstruction,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: interviewResponseSchema,
      },
      generation_config: {
        temperature: 0.2,
        max_output_tokens: 1024,
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

    const result = validateInterviewResponse(parsed);

    return preventRepeatedQuestion(result, request);
  } catch (error) {
    const mappedError = error instanceof GeminiClientError ? error : mapGeminiError(error);

    if (
      ['rate_limited', 'network_error', 'model_unavailable', 'empty_response', 'invalid_structured_output', 'gemini_api_error'].includes(
        mappedError.code,
      )
    ) {
      console.warn('Using fallback interview question after Gemini failure:', {
        code: mappedError.code,
        status: mappedError.status,
      });
      return createFallbackInterviewResponse(request);
    }

    throw mappedError;
  }
}
