import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';

import { App } from '@/app/App';
import { saveLocalCompanyProfile } from '@/services/profileService';
import * as proposalService from '@/services/proposalService';

describe('Figma v2 통합 화면 라우팅', () => {
  it.each([
    ['/', /기업의 실무 프로젝트와\s*시니어의 경험을 잇다/],
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
    ['/company/projects/new', '신규 프로젝트 등록'],
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

  it('랜딩 페이지는 소개 영상과 하단 프로젝트 CTA 하나만 제공한다', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(
      await screen.findByTitle('시니어의 경험과 기업의 과제가 만나는 이어잡 소개 영상'),
    ).toHaveAttribute('src', '/eojob-landing-hero.mp4');
    expect(screen.getByText(/경험을 잇고, 일을 잇고, 세대를 잇다\.\s*이어잡입니다/)).toBeInTheDocument();

    const projectButtons = screen.getAllByRole('button', { name: /전체 프로젝트 보러가기/ });
    expect(projectButtons).toHaveLength(1);
    fireEvent.click(projectButtons[0]!);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/senior/project-database');
    });
  });

  it.each([
    ['서비스 홈', '/senior'],
    ['인재로 로그인', '/login?role=senior'],
    ['기업으로 로그인', '/login?role=company'],
  ])('랜딩 상단의 %s 아이콘은 해당 화면으로 이동한다', async (label, destination) => {
    window.history.pushState({}, '', '/');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: label }));

    await waitFor(() => {
      expect(`${window.location.pathname}${window.location.search}`).toBe(destination);
    });
  });

  it('랜딩 페이지를 제외한 공통 상단바에는 로그인 여부와 관계없이 로그아웃 아이콘을 표시한다', async () => {
    window.history.pushState({}, '', '/login?role=senior');
    const { unmount } = render(<App />);

    expect(await screen.findByRole('button', { name: '로그아웃' })).toBeInTheDocument();

    act(() => unmount());
    window.history.pushState({}, '', '/');
    render(<App />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument();
  });

  it.each([
    ['프로젝트', '/senior/project-database'],
    ['AI 경험 인터뷰', '/senior/experience/interview'],
    ['내 제안', '/login'],
    ['내 정보', '/login'],
    ['Brand', '/'],
  ])('전체 메뉴의 %s 항목은 의미에 맞는 화면으로 이동한다', async (label, destination) => {
    window.history.pushState({}, '', '/');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '전체 메뉴 열기' }));
    expect(await screen.findByRole('dialog', { name: '전체 메뉴' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: label }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(destination);
    });
  });

  it('전체 메뉴에서 커뮤니티와 문의 채널을 확인할 수 있다', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '전체 메뉴 열기' }));
    const drawer = await screen.findByRole('dialog', { name: '전체 메뉴' });

    fireEvent.click(within(drawer).getByRole('button', { name: 'Community' }));
    expect(within(drawer).getByRole('link', { name: '카카오톡 오픈채팅방' })).toHaveAttribute(
      'href',
      'https://open.kakao.com/o/pCtnwCIi',
    );

    fireEvent.click(within(drawer).getByRole('button', { name: 'Contact' }));
    expect(within(drawer).getByRole('link', { name: '이어잡에 컨택하기' })).toHaveAttribute(
      'href',
      'mailto:phj1120@gmail.com',
    );
  });


  it('AI 인터뷰의 실제 답변으로 경험 카드를 생성한다', async () => {
    sessionStorage.clear();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          card: {
            title: '고객 문의 운영 개선',
            problem: '고객 문의 기준이 부족해 응답이 지연되었습니다.',
            role: '서비스 운영 책임자로 개선을 주도했습니다.',
            action: '문의 유형을 분석하고 처리 절차를 표준화했습니다.',
            result: '평균 응답 시간을 30% 줄였습니다.',
            skills: ['문제 해결', '프로세스 개선'],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
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
    const requestInit = fetchMock.mock.calls[0]?.[1];
    const requestBody = JSON.parse(typeof requestInit?.body === 'string' ? requestInit.body : '{}') as {
      history?: Array<{ answer?: string }>;
    };
    expect(requestBody.history?.some((item) => item.answer?.includes('광고 운영 문의'))).toBe(true);
    expect(screen.getAllByText('평균 응답 시간을 30% 줄였습니다.').length).toBeGreaterThanOrEqual(1);
    fetchMock.mockRestore();
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
    fireEvent.change(await screen.findByLabelText('회사명 *'), {
      target: { value: '테스트 회사' },
    });
    fireEvent.change(screen.getByLabelText('프로젝트 제목 *'), {
      target: { value: '운영 체계 만들기' },
    });
    fireEvent.change(screen.getByLabelText('근무 지역'), { target: { value: '서울' } });
    fireEvent.change(screen.getByLabelText('필요 경력'), {
      target: { value: '서비스 운영 5년 이상' },
    });
    fireEvent.change(screen.getByLabelText('프로젝트 기간'), { target: { value: '주 2회 · 원격' } });
    fireEvent.change(screen.getByLabelText('보수/예산'), { target: { value: '월 300만원' } });
    fireEvent.change(screen.getByLabelText('해결해야 할 문제 (Problem Statement) *'), {
      target: { value: '업무 흐름을 정리합니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 등록' }));
    expect(
      await screen.findByText(/프로젝트가 데이터베이스에 등록되었습니다|프로젝트를 기기에 저장했습니다/),
    ).toBeInTheDocument();
    expect((await screen.findAllByText('김도현')).length).toBeGreaterThan(0);
    expect(window.location.pathname).toBe('/company/project-database');
  });

  it('받은 제안의 진행 단계와 연락 상태를 확인한다', async () => {
    const proposal = {
      id: '1',
      projectId: 'project-1',
      projectOwnerId: 'company-test-uid',
      userId: 'senior-test-user',
      projectTitle: '테스트 프로젝트',
      status: '검토 중',
      processStage: 'document_review',
      appliedAt: '2026-08-30',
      applicantName: '지원자',
      applicantEmail: 'applicant@example.com',
    } as proposalService.UserProposal;
    const proposalsSpy = vi.spyOn(proposalService, 'getCompanyProposals').mockResolvedValue([proposal]);
    const stageSpy = vi.spyOn(proposalService, 'updateProposalProcessStage').mockResolvedValue();
    const contactSpy = vi.spyOn(proposalService, 'updateProposalContactStatus').mockResolvedValue();
    window.localStorage.clear();
    window.history.pushState({}, '', '/company/proposals/1');
    render(<App />);
    await waitFor(() => expect(proposalsSpy).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '2차 면접 단계로 변경' }));
    await waitFor(() => expect(stageSpy).toHaveBeenCalledWith('1', 'second_interview'));
    fireEvent.click(screen.getByRole('button', { name: '연락 완료로 표시' }));
    await waitFor(() => expect(contactSpy).toHaveBeenCalledWith('1', 'contacted'));
    const activeStageButton = screen.getByRole('button', { name: '2차 면접 단계로 변경' });
    expect(activeStageButton).toHaveAttribute('aria-pressed', 'true');
    expect(activeStageButton.querySelector('[aria-hidden="true"]')).toHaveClass('bg-[#173F3A]');
    stageSpy.mockRestore();
    contactSpy.mockRestore();
    proposalsSpy.mockRestore();
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

  it('로그인한 기업 회원은 상단에서 로그아웃할 수 있고 전체 메뉴에는 중복 노출하지 않는다', async () => {
    window.history.pushState({}, '', '/login?role=company');
    render(<App />);

    fireEvent.change(await screen.findByLabelText('이메일'), { target: { value: 'company@example.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: '기업으로 로그인 →' }));
    await waitFor(() => expect(window.location.pathname).toBe('/company'));

    const quickNav = screen.getByRole('navigation', { name: '빠른 이동' });
    for (const label of ['인재로 로그인', '기업으로 로그인', '서비스 홈', '로그아웃', '전체 메뉴 열기']) {
      expect(within(quickNav).getByRole('button', { name: label })).toBeInTheDocument();
    }
    fireEvent.click(within(quickNav).getByRole('button', { name: '전체 메뉴 열기' }));
    const drawer = await screen.findByRole('dialog', { name: '전체 메뉴' });
    expect(within(drawer).queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument();
    fireEvent.click(within(quickNav).getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(window.location.pathname).not.toContain('/senior');
  });
});
