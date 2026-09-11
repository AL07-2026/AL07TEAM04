import { render, screen } from '@testing-library/react';

import { ExperienceSummaryView } from './FlowPages';
import { ViewportProvider } from './Ui';

describe('ExperienceSummaryView responsive ownership', () => {
  const snapshot = {
    workedOn: '운영 기준을 정리했습니다.',
    accomplished: '업무 흐름을 안정화했습니다.',
    strengths: ['문서화', '조율'],
    version: 1 as const,
    confirmedAt: '2026-08-30T00:00:00.000Z',
  };

  function setDeviceMode(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        addEventListener: () => {},
        dispatchEvent: () => false,
        matches,
        media: '(max-width: 767px) and (pointer: coarse)',
        onchange: null,
        removeEventListener: () => {},
      }),
    });
  }

  it('renders a structurally vertical mobile branch with no two-column utilities', () => {
    setDeviceMode(true);
    render(
      <ViewportProvider>
        <ExperienceSummaryView snapshot={snapshot} />
      </ViewportProvider>,
    );

    const root = screen.getByTestId('experience-summary-mobile');
    expect(root.className).toMatch(/flex-col|grid-cols-1/);
    expect(root.className).not.toMatch(/grid-cols-2|md:grid-cols-2|basis-1\/2|w-1\/2/);
    expect(screen.getByText('해온 일').compareDocumentPosition(screen.getByText('해낸 일'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText('해낸 일').compareDocumentPosition(screen.getByText('잘하는 점'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('keeps the two-zone desktop branch separate', () => {
    setDeviceMode(false);
    render(
      <ViewportProvider>
        <ExperienceSummaryView snapshot={snapshot} />
      </ViewportProvider>,
    );
    expect(screen.getByTestId('experience-summary-desktop').className).toContain('md:grid-cols-2');
  });
});
