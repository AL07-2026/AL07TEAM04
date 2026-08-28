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
  eventType: 'page_view' | 'button_click' | 'apply' | 'interview' | 'action' | 'auth',
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
  eventType: 'page_view' | 'button_click' | 'apply' | 'interview' | 'action' | 'auth' = 'action',
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

  // 2. Firestore Real-time Event Collection
  void logToFirestore(eventType, eventName, params);
}

/**
 * Track Page Views across route transitions
 */
export function trackPageView(path: string, title?: string) {
  const pageTitle = title || document.title || path;
  void trackEvent(
    'page_view',
    {
      page_path: path,
      page_title: pageTitle,
      page_location: typeof window !== 'undefined' ? window.location.href : path,
    },
    'page_view',
  );
}

/**
 * Track Button Clicks (CTA, navigation, modals)
 */
export function trackButtonClick(buttonName: string, meta: Record<string, unknown> = {}) {
  void trackEvent(
    'button_click',
    {
      button_name: buttonName,
      ...meta,
    },
    'button_click',
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
