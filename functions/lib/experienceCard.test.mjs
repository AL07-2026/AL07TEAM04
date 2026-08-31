import { describe, expect, it } from 'vitest';

import { generateExperienceCard } from './experienceCard.mjs';

const history = [
  {
    question: '개발/엔지니어링 분야에서 가장 해결하기 어려웠던 실제 업무 문제는 무엇이었나요?',
    answer: 'AI 활용을 해서 개발을 하는 부분이 많다 보니 새로운 정보가 너무 많아서 어려웠습니다.',
  },
  {
    question: '그 문제를 해결할 때 맡았던 역할과 책임 범위를 알려주세요.',
    answer: '저의 역할은 개발자였고 프로젝트를 같이 개발하는 팀원이었습니다.',
  },
  {
    question: '문제를 해결하기 위해 직접 실행하거나 바꾼 방법을 구체적으로 알려주세요.',
    answer: 'AI 활용 방식에 익숙해지려고 찾아보고 실제 프로젝트에 적용했습니다.',
  },
  {
    question: '실행 후 달라진 결과를 수치나 확인 가능한 변화 중심으로 알려주세요.',
    answer: 'AI 활용 방식에 익숙해졌으며, 이를 통해 전반적인 개발 속도가 향상되었습니다.',
  },
];

function createClient(outputText) {
  return {
    interactions: {
      create: async () => ({
        output_text: outputText,
      }),
    },
  };
}

describe('experience card generation', () => {
  it('returns expanded analysis fields from Gemini structured output', async () => {
    const card = await generateExperienceCard(
      {
        selectedFields: ['개발/엔지니어링'],
        history,
      },
      {
        client: createClient(
          JSON.stringify({
            title: 'AI 개발 도구 학습 및 프로젝트 적용 경험',
            summary:
              'AI 기반 개발 방식이 확산되는 환경에서 새로운 도구를 학습하고 실제 프로젝트에 적용한 경험입니다.',
            problem:
              'AI 기반 개발 방식과 관련 정보가 빠르게 늘어나는 상황에서 새 도구를 이해하고 업무에 적용해야 하는 과제가 있었습니다.',
            role: '프로젝트 개발 팀원으로서 기능 구현 과정에 AI 도구를 적용하는 역할을 맡았습니다.',
            action:
              'AI 활용 방법을 학습하고 실제 개발 과정에 적용하면서 새로운 개발 방식을 익혀 나갔습니다.',
            result:
              'AI 활용 방식에 익숙해졌고 전반적인 개발 작업을 더 효율적으로 수행할 수 있게 되었습니다.',
            skills: ['AI 활용', '새로운 기술 학습', '변화 적응'],
            jobKeywords: ['AI 개발 도구', '개발 효율화', '프로젝트 개발'],
            facts: [
              'AI 활용 개발 방식이 많아졌다고 답변함',
              '개발자이자 프로젝트 팀원이었다고 답변함',
              'AI 활용 방식을 학습하고 프로젝트에 적용했다고 답변함',
            ],
            inferredSkills: [
              {
                skill: '새로운 기술 학습',
                reason:
                  '익숙하지 않은 AI 활용 방식을 학습하고 실제 프로젝트에 적용한 답변을 근거로 판단',
              },
            ],
            strengthInsight:
              '새로운 개발 방식을 학습하고 실제 업무에 적용해 개발 효율을 높인 경험입니다.',
            recruiterHighlight:
              '새로운 도구를 배우는 데 그치지 않고 실제 프로젝트 개발 과정에 적용한 점을 강조할 수 있습니다.',
            informationQuality: {
              problem: 'complete',
              role: 'complete',
              action: 'complete',
              result: 'weak',
            },
            missingInformation: [
              {
                field: 'result',
                reason: '개발 속도가 향상되었다고 했지만 구체적인 변화 전후가 부족합니다.',
                followUpQuestion:
                  'AI를 사용하기 전과 비교했을 때 개발 과정에서 가장 크게 달라진 점은 무엇인가요?',
              },
            ],
          }),
        ),
      },
    );

    expect(card.problem).not.toBe(history[0].answer);
    expect(card.facts).toHaveLength(3);
    expect(card.inferredSkills?.[0]).toMatchObject({ skill: '새로운 기술 학습' });
    expect(card.informationQuality?.result).toBe('weak');
    expect(card.missingInformation?.[0]?.field).toBe('result');
  });

  it('parses JSON even when Gemini wraps it in a json code block', async () => {
    const card = await generateExperienceCard(
      {
        selectedFields: ['개발/엔지니어링'],
        history,
      },
      {
        client: createClient(`\`\`\`json
{
  "title": "AI 도구 적용 경험",
  "summary": "AI 도구를 학습하고 개발 과정에 적용한 경험입니다.",
  "problem": "새로운 AI 개발 방식에 적응해야 하는 과제가 있었습니다.",
  "role": "프로젝트 개발 팀원으로 참여했습니다.",
  "action": "AI 활용 방법을 학습하고 개발 과정에 적용했습니다.",
  "result": "개발 작업을 더 효율적으로 수행할 수 있게 되었습니다.",
  "skills": ["AI 활용", "학습 역량"],
  "jobKeywords": ["AI 도구", "개발"],
  "facts": ["AI 활용 방법을 학습함"],
  "inferredSkills": [],
  "strengthInsight": "새로운 도구를 실제 업무에 적용한 경험입니다.",
  "recruiterHighlight": "학습한 도구를 프로젝트에 적용한 점을 강조할 수 있습니다.",
  "informationQuality": {
    "problem": "complete",
    "role": "complete",
    "action": "complete",
    "result": "weak"
  },
  "missingInformation": []
}
\`\`\``),
      },
    );

    expect(card.title).toBe('AI 도구 적용 경험');
    expect(card.summary).toContain('AI 도구');
  });
});
