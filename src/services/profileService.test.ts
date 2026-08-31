import { beforeEach, describe, expect, it } from 'vitest';

import { getLocalSeniorProfile, saveLocalSeniorProfile } from '@/services/profileService';

const validProfile = {
  desiredCategory: 'it-development-data',
  desiredCategory2: 'service',
  email: 'senior@example.com',
  experience: '서비스 개발과 운영을 총괄했습니다.',
  field: 'IT 서비스',
  period: '15년',
  phone: '010-0000-0000',
};

describe('profileService occupation preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('새 1·2·3순위 직종 값을 로컬 저장소에 저장하고 동일하게 읽는다', () => {
    saveLocalSeniorProfile(validProfile, 'senior-1');

    expect(getLocalSeniorProfile('senior-1')).toMatchObject({
      desiredCategory: 'it-development-data',
      desiredCategory2: 'service',
    });
  });

  it('기존 프로젝트 분류값을 읽을 때 새 21개 직종으로 변환하고 중복 순위를 제거한다', () => {
    localStorage.setItem(
      'eojob_senior_profile:senior-1',
      JSON.stringify({
        data: {
          ...validProfile,
          desiredCategory: 'ai-automation',
          desiredCategory2: 'dev-engineering',
          desiredCategory3: 'operations',
        },
        version: 1,
      }),
    );

    expect(getLocalSeniorProfile('senior-1')).toMatchObject({
      desiredCategory: 'it-development-data',
      desiredCategory2: 'service',
      desiredCategory3: undefined,
    });
  });

  it('여러 대표 경험 카드를 최신순으로 저장하고 기존 단일 카드도 호환한다', () => {
    saveLocalSeniorProfile(
      {
        ...validProfile,
        experienceCardsV1: [
          {
            id: 'card-old',
            workedOn: '기존 업무를 정리했습니다.',
            accomplished: '기존 성과를 만들었습니다.',
            strengths: ['정리'],
            version: 1,
            confirmedAt: '2026-08-29T00:00:00.000Z',
          },
          {
            id: 'card-new',
            workedOn: '새 업무를 정리했습니다.',
            accomplished: '새 성과를 만들었습니다.',
            strengths: ['개선'],
            version: 1,
            confirmedAt: '2026-08-31T00:00:00.000Z',
          },
        ],
      },
      'senior-1',
    );

    const profile = getLocalSeniorProfile('senior-1');

    expect(profile?.experienceProfileV1?.id).toBe('card-new');
    expect(profile?.experienceCardsV1?.map((card) => card.id)).toEqual(['card-new', 'card-old']);
  });

  it('경험 카드 배열이 비어 있으면 기존 단일 대표 카드로 되살리지 않는다', () => {
    localStorage.setItem(
      'eojob_senior_profile:senior-1',
      JSON.stringify({
        data: {
          ...validProfile,
          experienceProfileV1: {
            id: 'legacy-card',
            workedOn: '이전 업무',
            accomplished: '이전 성과',
            strengths: ['이전'],
            version: 1,
            confirmedAt: '2026-08-29T00:00:00.000Z',
          },
          experienceCardsV1: [],
        },
        version: 1,
      }),
    );

    const profile = getLocalSeniorProfile('senior-1');

    expect(profile?.experienceProfileV1).toBeUndefined();
    expect(profile?.experienceCardsV1).toEqual([]);
  });
});
