import { describe, expect, it } from 'vitest';

import {
  getFunnelStage,
  setupGlobalClickTracker,
  trackButtonClick,
  trackDropOff,
  trackEvent,
  trackInterviewActivity,
  trackJobApply,
  trackJobView,
  trackPageView,
  trackProjectCreate,
  trackProposalSubmit,
  trackSubsidyModalOpen,
} from './analyticsService';

describe('analyticsService', () => {
  it('safely handles trackEvent without throwing error', async () => {
    await expect(trackEvent('test_event', { key: 'value' })).resolves.not.toThrow();
  });

  it('safely handles trackPageView and maps funnel stages', () => {
    expect(() => trackPageView('/senior/project-database', '프로젝트 목록')).not.toThrow();
    expect(getFunnelStage('/')).toEqual({ step: 1, name: '01_랜딩_방문' });
    expect(getFunnelStage('/role')).toEqual({ step: 2, name: '02_회원_유형_선택' });
    expect(getFunnelStage('/senior/experience/interview')).toEqual({ step: 6, name: '06_AI_심층인터뷰_진행' });
  });

  it('safely handles trackButtonClick and trackDropOff', () => {
    expect(() => trackButtonClick('hero_cta', { target: '/senior/project-database' })).not.toThrow();
    expect(() => trackDropOff('user_left_interview')).not.toThrow();
  });

  it('safely handles trackJobView, trackJobApply, trackProposalSubmit, trackProjectCreate', () => {
    expect(() => trackJobView('JOB-123', '카카오', '프론트엔드 리드')).not.toThrow();
    expect(() => trackJobApply('JOB-123', '카카오', '프론트엔드 리드', 'start')).not.toThrow();
    expect(() => trackProposalSubmit('PROP-1', 'JOB-123', '프론트엔드 리드')).not.toThrow();
    expect(() => trackProjectCreate('PROJ-1', '신규 프로젝트', '테크노바')).not.toThrow();
  });

  it('safely handles trackInterviewActivity, trackSubsidyModalOpen, and setupGlobalClickTracker', () => {
    expect(() => trackInterviewActivity('start', '기획·전략')).not.toThrow();
    expect(() => trackSubsidyModalOpen('landing_banner')).not.toThrow();
    expect(() => setupGlobalClickTracker()).not.toThrow();
  });
});
