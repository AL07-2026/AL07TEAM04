import { useEffect, useState, type FormEvent } from 'react';
import {
  listPremiumApplications,
  reviewPremiumApplication,
  type PremiumApplication,
} from '@/services/premiumCompanyService';

const labels: Record<PremiumApplication['status'], string> = {
  pending: '기존 검토 대기',
  changes_requested: '보완 요청',
  rejected: '반려',
  approved: '노출 중',
  expired: '노출 종료',
  suspended: '노출 정지',
};

type ReviewDecision = 'approved' | 'changes_requested' | 'rejected' | 'end' | 'suspend' | 'restore';

function ReviewForm({
  application,
  onUpdated,
}: {
  application: PremiumApplication;
  onUpdated: (application: PremiumApplication) => void;
}): React.JSX.Element {
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<ReviewDecision>(
    application.status === 'approved'
      ? 'end'
      : application.status === 'suspended'
        ? 'restore'
        : 'approved',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const editable =
    application.status === 'pending' ||
    application.status === 'approved' ||
    application.status === 'suspended';
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !editable) return;
    setSaving(true);
    setError('');
    try {
      const result = await reviewPremiumApplication(application.id, {
        decision,
        revision: application.revision || 0,
        reviewNote: note,
      });
      onUpdated(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '처리하지 못했습니다. 새로고침 후 확인해 주세요.',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <article className="rounded-2xl border border-[#E0D9C8] bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h3 className="text-lg font-bold">{application.companyName}</h3>
        <p>
          {labels[application.status]} · 무료 잔여 {application.benefit?.remaining ?? '-'}회
        </p>
      </div>
      {application.imageUrl ? (
        <img
          src={application.imageUrl}
          alt={application.companyName + ' 신청 사진'}
          className="mt-4 aspect-video w-full max-w-sm rounded-xl object-cover"
        />
      ) : (
        <p className="mt-3 text-rose-700">대표 사진 보완이 필요합니다.</p>
      )}
      <h4 className="mt-4 font-bold">{application.headline}</h4>
      <p className="mt-2 whitespace-pre-wrap">{application.description}</p>
      <p className="mt-2">채용 분야: {application.hiringFocus || '미등록'}</p>
      {application.websiteUrl ? (
        <a
          className="mt-2 inline-block underline"
          href={application.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          기업 홈페이지
        </a>
      ) : null}
      {application.endsAt ? (
        <p className="mt-2">
          노출 종료 (한국 시간):{' '}
          {new Date(application.endsAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
        </p>
      ) : null}
      {application.reviewNote ? <p className="mt-3">검토 의견: {application.reviewNote}</p> : null}
      {editable ? (
        <form className="mt-4" onSubmit={(event) => void submit(event)}>
          <fieldset className="grid gap-3" disabled={saving}>
            <label className="grid gap-2 font-bold">
              처리 선택
              <select
                className="min-h-11 rounded-lg border p-2"
                value={decision}
                onChange={(event) => setDecision(event.target.value as ReviewDecision)}
              >
                {application.status === 'approved' ? (
                  <>
                    <option value="end">현재 노출만 종료</option>
                    <option value="suspend">기업 노출 정지</option>
                  </>
                ) : application.status === 'suspended' ? (
                  <option value="restore">기업 노출 정지 해제</option>
                ) : (
                  <>
                    <option value="approved">기존 대기 건 승인 및 즉시 노출 (1회 차감)</option>
                    <option value="changes_requested">보완 요청 (차감 없음)</option>
                    <option value="rejected">반려 (차감 없음)</option>
                  </>
                )}
              </select>
            </label>
            {decision === 'approved' ? (
              <p className="font-bold">
                승인일부터 1개월간 노출됩니다. 종료일은 한국 시간 기준으로 자동 계산됩니다.
              </p>
            ) : null}
            <label className="grid gap-2 font-bold">
              검토 의견
              <textarea
                className="min-h-24 rounded-lg border p-3"
                maxLength={500}
                required={
                  decision === 'rejected' ||
                  decision === 'changes_requested' ||
                  decision === 'suspend'
                }
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <p className="text-sm text-slate-600">
              신규 신청은 자동 승인됩니다. 일반 종료는 현재 노출만 끝내고, 정지는 해제할 때까지
              재신청을 차단합니다.
            </p>
            <button
              className="min-h-11 rounded-xl bg-[#173F3A] px-4 font-bold text-white disabled:opacity-60"
              disabled={saving || (decision === 'approved' && !application.imageUrl)}
              type="submit"
            >
              {saving ? '처리 중' : '검토 결과 저장'}
            </button>
          </fieldset>
          {error ? (
            <p role="alert" className="mt-3 text-rose-700">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </article>
  );
}

export function PremiumApplicationsAdmin({ canManage }: { canManage: boolean }): React.JSX.Element {
  const [applications, setApplications] = useState<PremiumApplication[]>([]);
  const [cursor, setCursor] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!canManage) return;
    let active = true;
    listPremiumApplications(cursor)
      .then((result) => {
        if (!active) return;
        setApplications(result.applications);
        setNextCursor(result.nextCursor);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : '신청 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canManage, cursor, refresh]);
  if (!canManage) return <p>운영 관리자만 프리미엄 신청을 검토할 수 있습니다.</p>;
  const reload = (next: string) => {
    setLoading(true);
    setError('');
    setCursor(next);
    setRefresh((value) => value + 1);
  };
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">프리미엄 신청 관리</h2>
        <button
          type="button"
          className="min-h-11 rounded-xl border bg-white px-4 font-bold"
          disabled={loading}
          onClick={() => reload('')}
        >
          처음부터 새로고침
        </button>
      </div>
      <p>
        기업회원별 무료 노출 3회는 신청 즉시 자동 승인되며 1회당 1개월입니다. 기존 대기 건 처리,
        현재 노출 종료·정지는 운영자가 관리합니다.
      </p>
      {notice ? <p role="status">{notice}</p> : null}
      {loading ? (
        <p role="status">신청 목록을 불러오는 중입니다.</p>
      ) : error ? (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      ) : (
        <>
          {applications.length === 0 ? (
            <p>접수된 신청이 없습니다.</p>
          ) : (
            applications.map((application) => (
              <ReviewForm
                key={application.id + ':' + (application.revision || 0)}
                application={application}
                onUpdated={(updated) => {
                  setApplications((items) =>
                    items.map((item) => (item.id === updated.id ? updated : item)),
                  );
                  setNotice('검토 결과가 서버에 저장되었습니다.');
                }}
              />
            ))
          )}
          {nextCursor ? (
            <button
              type="button"
              className="min-h-11 rounded-xl border bg-white px-4 font-bold"
              onClick={() => reload(nextCursor)}
            >
              다음 신청 목록
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
