import { describe, expect, it } from 'vitest';

import {
  trackButtonClick,
  trackEvent,
  trackInterviewActivity,
  trackJobApply,
  trackJobView,
  trackPageView,
  trackSubsidyModalOpen,
} from './analyticsService';

describe('analyticsService', () => {
  it('safely handles trackEvent without throwing error', async () => {
    await expect(trackEvent('test_event', { key: 'value' })).resolves.not.toThrow();
  });

  it('safely handles trackPageView', () => {
    expect(() => trackPageView('/senior/project-database', '프로젝트 목록')).not.toThrow();
  });

  it('safely handles trackButtonClick', () => {
    expect(() => trackButtonClick('hero_cta', { target: '/senior/project-database' })).not.toThrow();
  });

  it('safely handles trackJobView and trackJobApply', () => {
    expect(() => trackJobView('JOB-123', '카카오', '프론트엔드 리드')).not.toThrow();
    expect(() => trackJobApply('JOB-123', '카카오', '프론트엔드 리드', 'start')).not.toThrow();
  });

  it('safely handles trackInterviewActivity and trackSubsidyModalOpen', () => {
    expect(() => trackInterviewActivity('start', '기획·전략')).not.toThrow();
    expect(() => trackSubsidyModalOpen('landing_banner')).not.toThrow();
  });
});
