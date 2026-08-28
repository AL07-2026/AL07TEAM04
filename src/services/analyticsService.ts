import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import app, { db } from '@/lib/firebase';

let analyticsInstance: Analytics | null = null;
let isAnalyticsInitialized = false;

// Async initialize Firebase Analytics (safely handles environments where window / IndexedDB is unavailable like SSR or test runners)
async function getOrInitAnalytics(): Promise<Analytics | null> {
  if (isAnalyticsInitialized) return analyticsInstance;
  if (typeof window === 'undefined') return null;

  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  } catch (err) {
    console.warn('[Analytics] Firebase Analytics initialization skipped:', err);
  } finally {
    isAnalyticsInitialized = true;
  }
  return analyticsInstance;
}

// Log event to Firestore `analytics_events` for real-time console verification
async function logToFirestore(
  eventType: 'page_view' | 'button_click' | 'apply' | 'interview' | 'action' | 'auth' | 'funnel' | 'drop_off',
  eventName: string,
  params: Record<string, unknown> = {},
) {
  if (typeof window === 'undefined' || !db) return;
  try {
    const isMobile = window.innerWidth <= 768;
    const path = window.location.pathname;
    await addDoc(collection(db, 'analytics_events'), {
      eventType,
      eventName,
      path,
      device: isMobile ? 'mobile' : 'desktop',
      params,
      createdAt: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
    });
  } catch {
    // Non-blocking fire-and-forget
  }
}

/**
 * Universal Event Logger: Logs to both Firebase Analytics (GA4) and Firestore real-time collection
 */
export async function trackEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  eventType:
    | 'page_view'
    | 'button_click'
    | 'apply'
    | 'interview'
    | 'action'
    | 'auth'
    | 'funnel'
    | 'drop_off' = 'action',
) {
  // 1. Firebase Analytics (GA4 Dashboard)
  const analytics = await getOrInitAnalytics();
  if (analytics) {
    try {
      logEvent(analytics, eventName, params);
    } catch (err) {
      console.debug('[Analytics] logEvent error:', err);
    }
  }

  // 1-2. Direct Google Tag (gtag) dispatch
  if (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === 'function'
  ) {
    try {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName, params);
    } catch {
      // ignore
    }
  }

  // 2. Firestore Real-time Event Collection
  void logToFirestore(eventType, eventName, params);
}

/**
 * Map pathname to standardized Funnel Stage
 */
export function getFunnelStage(path: string): { step: number; name: string } {
  if (path === '/') return { step: 1, name: '01_랜딩_방문' };
  if (path.startsWith('/role')) return { step: 2, name: '02_회원_유형_선택' };
  if (path.startsWith('/signup')) return { step: 3, name: '03_회원가입_작성' };
  if (path.startsWith('/login')) return { step: 3, name: '03_로그인_화면' };
  if (path.startsWith('/basic-profile')) return { step: 4, name: '04_인재_기본정보_입력' };
  if (path.startsWith('/company-info')) return { step: 4, name: '04_기업_정보_입력' };
  if (path === '/senior/experience') return { step: 5, name: '05_AI_경험등록_안내' };
  if (path.startsWith('/senior/experience/interview')) return { step: 6, name: '06_AI_심층인터뷰_진행' };
  if (path.startsWith('/senior/experience/card')) return { step: 7, name: '07_경험카드_생성완료' };
  if (path.startsWith('/senior/project-database')) return { step: 8, name: '08_실시간_공고_탐색' };
  if (path === '/senior/projects' || path === '/senior') return { step: 8, name: '08_시니어_프로젝트_홈' };
  if (path.endsWith('/proposal')) return { step: 10, name: '10_프로젝트_제안서_작성' };
  if (path.startsWith('/senior/projects/')) return { step: 9, name: '09_공고_상세_조회' };
  if (path.startsWith('/senior/proposal-complete')) return { step: 11, name: '11_제안서_제출_완료' };
  if (path.startsWith('/company/projects/new')) return { step: 8, name: '08_기업_프로젝트_등록' };
  if (path.startsWith('/company/project-complete')) return { step: 9, name: '09_기업_프로젝트_등록완료' };
  return { step: 0, name: 'other_navigation' };
}

let lastPagePath = '';
let lastPageTimestamp = Date.now();

/**
 * Track Page Views across route transitions + Auto Funnel Tracking
 */
export function trackPageView(path: string, title?: string) {
  const pageTitle = title || (typeof document !== 'undefined' ? document.title : path);
  const now = Date.now();
  const timeOnPreviousPage = lastPagePath ? Math.round((now - lastPageTimestamp) / 1000) : 0;
  const funnel = getFunnelStage(path);

  void trackEvent(
    'page_view',
    {
      page_path: path,
      page_title: pageTitle,
      page_location: typeof window !== 'undefined' ? window.location.href : path,
      funnel_step: funnel.step,
      funnel_name: funnel.name,
      previous_path: lastPagePath || '(entry)',
      time_on_previous_page_sec: timeOnPreviousPage,
    },
    'page_view',
  );

  // If entering a defined funnel step, track funnel event
  if (funnel.step > 0) {
    void trackEvent(
      `funnel_${funnel.name}`,
      {
        step_number: funnel.step,
        step_name: funnel.name,
        path,
        previous_path: lastPagePath || '(entry)',
      },
      'funnel',
    );
  }

  lastPagePath = path;
  lastPageTimestamp = now;
}

/**
 * Track Explicit Button Clicks
 */
export function trackButtonClick(buttonName: string, meta: Record<string, unknown> = {}) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const funnel = getFunnelStage(currentPath);

  void trackEvent(
    'button_click',
    {
      button_name: buttonName,
      page_path: currentPath,
      funnel_step: funnel.step,
      funnel_name: funnel.name,
      ...meta,
    },
    'button_click',
  );
}

/**
 * Track User Drop-Off Point
 */
export function trackDropOff(
  reason: string,
  extra: Record<string, unknown> = {},
) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const funnel = getFunnelStage(currentPath);
  const timeSpent = Math.round((Date.now() - lastPageTimestamp) / 1000);

  void trackEvent(
    'user_drop_off',
    {
      reason,
      exit_path: currentPath,
      funnel_step: funnel.step,
      funnel_name: funnel.name,
      time_spent_seconds: timeSpent,
      ...extra,
    },
    'drop_off',
  );
}

/**
 * Track Job Detail View
 */
export function trackJobView(jobId: string, companyName: string, title: string) {
  void trackEvent(
    'view_job_detail',
    {
      job_id: jobId,
      company_name: companyName,
      job_title: title,
    },
    'action',
  );
}

/**
 * Track Application Flow
 */
export function trackJobApply(
  jobId: string,
  companyName: string,
  title: string,
  step: 'start' | 'submit_success' | 'external_redirect',
) {
  void trackEvent(
    `job_apply_${step}`,
    {
      job_id: jobId,
      company_name: companyName,
      job_title: title,
      step,
    },
    'apply',
  );
}

/**
 * Track AI Experience Interview Steps
 */
export function trackInterviewActivity(
  step: 'start' | 'answer_submit' | 'complete' | 'card_view',
  category?: string,
) {
  void trackEvent(
    `interview_${step}`,
    {
      step,
      category: category || 'general',
    },
    'interview',
  );
}

/**
 * Track Subsidy Benefit Modal Open
 */
export function trackSubsidyModalOpen(source: 'landing_banner' | 'basic_profile' | 'detail_view') {
  void trackEvent(
    'subsidy_modal_open',
    {
      source,
    },
    'action',
  );
}

/**
 * Track Proposal Submission
 */
export function trackProposalSubmit(proposalId: string, projectId: string, title: string) {
  void trackEvent(
    'proposal_submitted',
    {
      proposal_id: proposalId,
      project_id: projectId,
      project_title: title,
    },
    'apply',
  );
}

/**
 * Track Company Project Creation
 */
export function trackProjectCreate(projectId: string, title: string, companyName: string) {
  void trackEvent(
    'company_project_created',
    {
      project_id: projectId,
      project_title: title,
      company_name: companyName,
    },
    'action',
  );
}

let isGlobalTrackerSetup = false;

/**
 * Global Automatic Click Tracker: Captures 100% of interactive clicks across the entire app
 * Analyzes buttons, links, tabs, modal triggers, and form submits
 */
export function setupGlobalClickTracker() {
  if (isGlobalTrackerSetup || typeof window === 'undefined') return;
  isGlobalTrackerSetup = true;

  document.addEventListener(
    'click',
    (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Find nearest interactive element
      const interactiveEl = target.closest<HTMLElement>(
        'button, a, [role="button"], input[type="submit"], input[type="button"], [data-track], [data-analytics]',
      );
      if (!interactiveEl) return;

      // Determine label / identifier
      const explicitTrack = interactiveEl.getAttribute('data-track') || interactiveEl.getAttribute('data-analytics');
      const ariaLabel = interactiveEl.getAttribute('aria-label');
      const textContent = (interactiveEl.innerText || interactiveEl.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const titleAttr = interactiveEl.getAttribute('title');
      const nameAttr = interactiveEl.getAttribute('name');
      const idAttr = interactiveEl.id;

      const buttonLabel = explicitTrack || ariaLabel || textContent || titleAttr || nameAttr || idAttr || 'unlabeled_button';

      // Determine section / context
      const sectionEl = interactiveEl.closest('header, main, nav, aside, footer, dialog, form, [data-section]');
      const sectionName = sectionEl?.getAttribute('data-section') || sectionEl?.tagName.toLowerCase() || 'content';
      const elementType = interactiveEl.tagName.toLowerCase();
      const href = interactiveEl.getAttribute('href') || undefined;

      trackButtonClick(buttonLabel, {
        element_type: elementType,
        section: sectionName,
        target_href: href,
        element_id: idAttr || undefined,
      });
    },
    { capture: true },
  );

  // Track session exit / page leave for drop-off analysis
  window.addEventListener('beforeunload', () => {
    trackDropOff('window_beforeunload');
  });

  window.addEventListener('pagehide', () => {
    trackDropOff('pagehide_visibility_hidden');
  });
}
