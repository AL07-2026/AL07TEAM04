import { fireEvent, render, screen } from '@testing-library/react';

import { App } from '@/app/App';

describe('Figma v2 통합 화면 라우팅', () => {
  it.each([
    ['/login', '경험매칭'],
    ['/signup', '회원가입'],
    ['/role', '역할 선택'],
    ['/basic-profile', '인재 기본정보'],
    ['/company-info', '회사 기본정보'],
    ['/senior', '인재 홈'],
    ['/senior/experience', '경험 선택'],
    ['/senior/experience/interview', 'AI 경험 인터뷰'],
    ['/senior/experience/card', '경험 카드가 완성됐어요'],
    ['/senior/projects', '프로젝트 목록'],
    ['/senior/projects/1', '프로젝트 상세'],
    ['/senior/projects/1/proposal', '제안하기'],
    ['/senior/proposal-complete', '제안 완료'],
    ['/senior/proposals', '내 제안'],
    ['/senior/proposals/1', '내 제안 상세'],
    ['/company', '회사 홈'],
    ['/company/projects/new', '프로젝트 등록'],
    ['/company/project-complete', '등록 완료'],
    ['/company/projects', '프로젝트 관리'],
    ['/company/proposals', '받은 제안'],
    ['/company/proposals/1', '제안 상세'],
  ])('%s 화면을 표시한다', async (path, heading) => {
    window.history.pushState({}, '', path);
    render(<App />);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('회원가입 후 인재 기본정보 입력으로 바로 이동한다', async () => {
    window.history.pushState({}, '', '/signup?role=senior');
    render(<App />);
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '김인재' } });
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'senior@example.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '인재 기본정보 입력 →' }));
    expect(await screen.findByRole('heading', { name: '인재 기본정보' })).toBeInTheDocument();
  });

  it('프로젝트 제안을 작성하고 완료 화면으로 이동한다', async () => {
    window.history.pushState({}, '', '/senior/projects/1/proposal');
    render(<App />);
    fireEvent.change(screen.getByLabelText('한 줄 소개'), {
      target: { value: '운영 경험이 있습니다.' },
    });
    fireEvent.change(screen.getByLabelText('진행 방법'), {
      target: { value: '현황 확인 후 기준을 정리합니다.' },
    });
    fireEvent.change(screen.getByLabelText('시작 가능일'), { target: { value: '8월 20일' } });
    fireEvent.click(screen.getByRole('button', { name: '제안 보내기' }));
    expect(await screen.findByRole('heading', { name: '제안 완료' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/senior/proposal-complete');
  });

  it('회사 프로젝트를 등록하고 완료 화면으로 이동한다', async () => {
    window.history.pushState({}, '', '/company/projects/new');
    render(<App />);
    for (const [label, value] of [
      ['프로젝트 제목', '운영 체계 만들기'],
      ['프로젝트 내용', '업무 흐름을 정리합니다.'],
      ['필요 경험', '서비스 운영 5년 이상'],
      ['진행 조건', '주 2회 · 원격'],
      ['근무 위치', '서울'],
    ] as const)
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 등록하기' }));
    expect(await screen.findByRole('heading', { name: '등록 완료' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/company/project-complete');
  });

  it('받은 제안의 상태와 대화 제안을 확인한다', () => {
    window.history.pushState({}, '', '/company/proposals/1');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '검토 중으로 변경' }));
    expect(screen.getByText('제안 상태를 검토 중으로 변경했습니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '대화 제안하기' }));
    expect(screen.getByText(/010-1234-5678/)).toBeInTheDocument();
  });
});
