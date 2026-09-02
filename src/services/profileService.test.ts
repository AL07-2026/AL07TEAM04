import { getDoc, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { writeVersionedStorage } from '@/lib/browserStorage';
import {
  getLocalSeniorProfile,
  resolveSeniorProfile,
  saveLocalSeniorProfile,
  saveSeniorProfile,
} from '@/services/profileService';

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
    vi.clearAllMocks();
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
    vi.mocked(setDoc).mockResolvedValue(undefined);
  });

  it('새 1·2·3순위 직종 값을 로컬 저장소에 저장하고 동일하게 읽는다', () => {
    saveLocalSeniorProfile(validProfile, 'senior-1');

    expect(getLocalSeniorProfile('senior-1')).toMatchObject({
      desiredCategory: 'it-development-data',
      desiredCategory2: 'service',
    });
  });

  it('원하는 근무 형태와 대표 경험을 서로 다른 매칭 데이터로 보존한다', () => {
    saveLocalSeniorProfile(
      {
        ...validProfile,
        desiredWorkType: '정규직',
        experience: '레거시 시스템 현대화와 개발 조직 전환을 총괄했습니다.',
      },
      'senior-1',
    );

    expect(getLocalSeniorProfile('senior-1')).toMatchObject({
      desiredWorkType: '정규직',
      experience: '레거시 시스템 현대화와 개발 조직 전환을 총괄했습니다.',
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

  it('현재 브라우저에 이전 계정 캐시가 있어도 다른 UID의 프로필로 대체하지 않는다', () => {
    writeVersionedStorage('eojob_current_user', {
      email: 'old@example.com',
      role: 'senior',
      uid: 'senior-old',
    });
    saveLocalSeniorProfile(validProfile, 'senior-old');

    expect(getLocalSeniorProfile('senior-new')).toBeNull();
  });

  it('로그인 UID가 있으면 로컬 캐시보다 Firestore 최신 프로필을 우선하고 캐시를 갱신한다', async () => {
    saveLocalSeniorProfile(validProfile, 'senior-1');
    vi.mocked(getDoc).mockResolvedValue({
      data: () => ({
        ...validProfile,
        desiredCategory: 'planning-strategy',
        desiredCategory2: 'accounting-tax-finance',
        desiredCategory3: 'marketing-pr-research',
        updatedAt: '2026-08-31T01:00:00.000Z',
      }),
      exists: () => true,
    } as never);

    const resolved = await resolveSeniorProfile('senior-1');

    expect(getDoc).toHaveBeenCalledOnce();
    expect(resolved).toMatchObject({
      desiredCategory: 'planning-strategy',
      desiredCategory2: 'accounting-tax-finance',
      desiredCategory3: 'marketing-pr-research',
    });
    expect(getLocalSeniorProfile('senior-1')).toMatchObject(resolved!);
  });

  it('Firestore 문서가 없으면 과거 로컬 프로필을 현재 서버 데이터처럼 사용하지 않는다', async () => {
    saveLocalSeniorProfile(validProfile, 'senior-1');

    await expect(resolveSeniorProfile('senior-1')).resolves.toBeNull();
    expect(getDoc).toHaveBeenCalledOnce();
    expect(getLocalSeniorProfile('senior-1')).toBeNull();
  });

  it('Firestore 조회가 실패한 오프라인 상황에서만 같은 UID의 로컬 프로필을 사용한다', async () => {
    saveLocalSeniorProfile(validProfile, 'senior-1');
    vi.mocked(getDoc).mockRejectedValue(new Error('offline'));

    await expect(resolveSeniorProfile('senior-1')).resolves.toMatchObject(validProfile);
    expect(getDoc).toHaveBeenCalledOnce();
  });

  it('서버 저장이 성공한 프로필만 갱신 시각과 함께 사용자 캐시에 반영한다', async () => {
    const saved = await saveSeniorProfile('senior-1', validProfile);

    expect(setDoc).toHaveBeenCalledOnce();
    expect(saved.updatedAt).toEqual(expect.any(String));
    expect(getLocalSeniorProfile('senior-1')).toMatchObject(saved);
  });
});
