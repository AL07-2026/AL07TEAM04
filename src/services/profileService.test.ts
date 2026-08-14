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
});
