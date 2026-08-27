import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SummaryCard } from '@/app/wireframe/Ui';

describe('SummaryCard', () => {
  it('renders an interactive metric as an accessible native button', () => {
    const onClick = vi.fn();

    render(
      <SummaryCard
        interactiveLabel="추천 프로젝트 18개 보기"
        label="추천 프로젝트"
        onClick={onClick}
        value="18개"
      />,
    );

    const card = screen.getByRole('button', { name: '추천 프로젝트 18개 보기' });
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledOnce();
  });
});
