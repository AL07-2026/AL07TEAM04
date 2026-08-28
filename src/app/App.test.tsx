import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { App } from '@/app/App';
import { saveLocalCompanyProfile } from '@/services/profileService';

describe('Figma v2 통합 화면 라우팅', () => {
  it.each([
    ['/', /10년~30년 시니어의/],
    ['/login', '경험매칭'],
    ['/signup', '회원가입'],
    ['/role', '역할 선택'],
    ['/basic-profile', '인재 기본정보'],
    ['/company-info', '회사 기본정보'],
    ['/senior', '인재 홈'],
    ['/senior/experience', '경험 선택'],
    ['/senior/experience/interview', 'AI 경험 인터뷰'],
    ['/senior/experience/card', '인터뷰 결과를 먼저 만들어 주세요'],
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
    ['/company/profile', '내 정보'],
  ])('%s 화면을 표시한다', async (path, heading) => {
    window.history.pushState({}, '', path);
    render(<App />);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('AI 인터뷰의 실제 답변으로 경험 카드를 생성한다', async () => {
    sessionStorage.clear();
    window.history.pushState({}, '', '/senior/experience/interview');
    render(<App />);

    const answerInput = await screen.findByLabelText('현재 인터뷰 답변');
    expect(screen.getAllByText('버튼을 누르면 마이크 권한을 요청합니다.')).toHaveLength(1);
    for (const answer of [
      '고객 문의 기준이 없어 응답이 지연되었습니다.',
      '서비스 운영 책임자로 개선을 주도했습니다.',
      '문의 유형을 분석하고 처리 절차를 표준화했습니다.',
      '평균 응답 시간을 30% 줄였습니다.',
    ]) {
      fireEvent.change(answerInput, { target: { value: answer } });
      fireEvent.click(screen.getByRole('button', { name: '입력' }));
    }

    fireEvent.click(screen.getAllByRole('button', { name: '답변 수정' })[0]!);
    fireEvent.change(screen.getByLabelText('수정할 인터뷰 답변'), {
      target: { value: '고객 문의 기준이 부족해 광고 운영 문의 응답이 지연되었습니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정한 답변 저장' }));

    fireEvent.click(screen.getByRole('button', { name: '실제 답변으로 만든 경험 카드 확인 →' }));
    expect(
      await screen.findByRole('heading', { name: '경험 카드가 완성됐어요' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('고객 문의 기준이 부족해 광고 운영 문의 응답이 지연되었습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByText('평균 응답 시간을 30% 줄였습니다.')).toBeInTheDocument();
  });

  it('인재 홈의 AI 경험 인터뷰 CTA는 경험 선택 화면으로 먼저 이동한다', async () => {
    window.history.pushState({}, '', '/senior');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /AI 경험 인터뷰 시작하기/ }));

    expect(await screen.findByRole('heading', { name: '경험 선택' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/senior/experience');
  });

  it('경험 선택 화면에서 고른 분야를 AI 인터뷰 기준에 반영한다', async () => {
    window.history.pushState({}, '', '/senior/experience');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '인사/경영전략' }));
    fireEvent.click(screen.getByRole('button', { name: 'AI 경험 인터뷰 진행 (추천)' }));

    expect(
      await screen.findByText('운영 효율화 · 마케팅/영업 · 인사/경영전략'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '운영 효율화 · 마케팅/영업 · 인사/경영전략 분야에서 가장 해결하기 어려웠던 실제 업무 문제는 무엇이었나요?',
      ),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/senior/experience/interview');
  });

  it('AI 인터뷰 직접 입력칸에서 Enter는 답변 제출 대신 줄바꿈으로 사용한다', async () => {
    window.history.pushState({}, '', '/senior/experience/interview');
    render(<App />);

    const answerInput = await screen.findByLabelText('현재 인터뷰 답변');
    fireEvent.change(answerInput, {
      target: { value: '첫 번째 줄\n두 번째 줄' },
    });
    fireEvent.keyDown(answerInput, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('질문 1/4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '입력' }));

    expect(screen.getByText('질문 2/4')).toBeInTheDocument();
    expect(screen.getByText(/첫 번째 줄/)).toBeInTheDocument();
  });

  it('회원가입 후 이메일 인증 및 인재 기본정보 입력으로 바로 이동한다', async () => {
    window.history.pushState({}, '', '/signup?role=senior');
    render(<App />);
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '김인재' } });
    const testEmail = `senior-${Date.now()}@example.com`;
    fireEvent.change(screen.getByLabelText('이메일 (인증용 개인메일)'), {
      target: { value: testEmail },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox'));
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /인증 메일 받기/ }));
    });
    expect(
      await screen.findByRole('heading', { name: '이메일 인증을 완료해주세요' }, { timeout: 5000 }),
    ).toBeInTheDocument();

    const nextButton = await screen.findByRole('button', { name: /이메일 인증 완료 및 다음 단계/ });
    await waitFor(() => expect(nextButton).not.toBeDisabled(), { timeout: 4000 });
    act(() => {
      fireEvent.click(nextButton);
    });
    expect(await screen.findByRole('heading', { name: '경험 정보 수정' })).toBeInTheDocument();
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
    saveLocalCompanyProfile(
      {
        companyName: '테스트 회사',
        companyAddress: '서울 강남구',
        email: 'manager@example.com',
        managerName: '담당자',
        phone: '010-1234-5678',
        industry: 'IT',
      },
      'company-test-uid',
    );
    window.history.pushState({}, '', '/company/projects/new');
    render(<App />);
    for (const [label, value] of [
      ['프로젝트 제목', '운영 체계 만들기'],
      ['프로젝트 내용', '업무 흐름을 정리합니다.'],
      ['필요 경험', '서비스 운영 5년 이상'],
      ['진행 조건', '주 2회 · 원격'],
      ['근무 위치', '서울'],
      ['보수/급여', '월 300만원'],
    ] as const)
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 등록하기' }));
    expect(await screen.findByRole('heading', { name: '등록 완료' })).toBeInTheDocument();
    expect(await screen.findByText('운영 체계 만들기')).toBeInTheDocument();
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

  it('인재 기본정보를 수정하고 정상적으로 저장되는지 확인한다', async () => {
    window.history.pushState({}, '', '/basic-profile');
    render(<App />);
    expect(await screen.findByRole('heading', { name: '경험 정보 수정' })).toBeInTheDocument();

    const primaryOccupation = screen.getByLabelText('1순위 희망 직종 (필수)');
    expect(primaryOccupation.querySelectorAll('option')).toHaveLength(23);
    fireEvent.change(primaryOccupation, { target: { value: 'other' } });
    expect(screen.getByLabelText('기타 희망 직종명 (필수)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /변경사항 저장하기/ }));
    expect(
      screen.getAllByText('기타 직종을 선택한 경우 희망 직종명을 2자 이상 입력해 주세요.'),
    ).not.toHaveLength(0);
    fireEvent.change(primaryOccupation, {
      target: { value: 'it-development-data' },
    });
    expect(screen.queryByLabelText('기타 희망 직종명 (필수)')).not.toBeInTheDocument();
    expect(
      screen
        .getByLabelText('2순위 희망 직종 (선택)')
        .querySelector('option[value="it-development-data"]'),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText('경력 분야'), { target: { value: 'AI 서비스 개발' } });
    fireEvent.change(screen.getByLabelText('경력 기간'), { target: { value: '15년' } });
    fireEvent.change(screen.getByLabelText(/원하는 근무 형태/), {
      target: { value: '시간제·파트타임 (오전/오후)' },
    });
    fireEvent.change(screen.getByLabelText('연락처'), { target: { value: '010-0000-0000' } });
    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'senior@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /변경사항 저장하기/ }));

    expect(
      await screen.findByText('✓ 프로필 정보가 성공적으로 저장되었습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByText('AI 서비스 개발')).toBeInTheDocument();
    expect(screen.getByText('15년')).toBeInTheDocument();
  });

  it('회사 기본정보를 수정하고 정상적으로 저장되는지 확인한다', async () => {
    window.history.pushState({}, '', '/company-info');
    render(<App />);
    expect(await screen.findByRole('heading', { name: '저장된 회사 정보' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '정보 수정' }));
    expect(screen.getByRole('heading', { name: '회사 정보 수정' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('회사명'), { target: { value: '(주) 테크노바' } });
    fireEvent.click(screen.getByRole('button', { name: /변경사항 저장하기/ }));

    expect(await screen.findByText('✓ 회사 정보가 성공적으로 저장되었습니다.')).toBeInTheDocument();
    expect(screen.getAllByText('(주) 테크노바').length).toBeGreaterThan(0);
  });

  it('저장한 회사 정보를 내 정보 탭에서도 같은 내용으로 보여준다', async () => {
    saveLocalCompanyProfile({
      companyAddress: '서울특별시 동대문구 고산자로 515',
      companyName: '엘레오스',
      email: 'contact@eleos.co.kr',
      industry: '생활용품 제조',
      managerName: '이동욱',
      phone: '010-5271-3612',
    });
    window.history.pushState({}, '', '/company/profile');
    render(<App />);

    expect(await screen.findByText('엘레오스')).toBeInTheDocument();
    expect(screen.getByText('이동욱', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('서울특별시 동대문구 고산자로 515')).toBeInTheDocument();
    expect(screen.getByText('010-5271-3612')).toBeInTheDocument();
    expect(screen.getByText('생활용품 제조')).toBeInTheDocument();
  });
});
