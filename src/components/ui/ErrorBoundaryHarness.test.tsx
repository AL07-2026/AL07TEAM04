import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundaryHarness } from './ErrorBoundaryHarness';

function ProblemChild(): React.ReactNode {
  throw new Error('Test Error in Harness');
}

describe('ErrorBoundaryHarness Component', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundaryHarness>
        <div>Normal Content</div>
      </ErrorBoundaryHarness>,
    );

    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('catches error and displays fallback UI', () => {
    const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundaryHarness>
        <ProblemChild />
      </ErrorBoundaryHarness>,
    );

    expect(screen.getByText('화면을 불러오는 중 오류가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByText('Test Error in Harness')).toBeInTheDocument();

    spyConsole.mockRestore();
  });
});
