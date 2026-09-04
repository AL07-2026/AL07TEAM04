import {
  Flag,
  Heart,
  MessageCircle,
  Pencil,
  PenLine,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  createLoginRedirectPath,
  LOGIN_REQUIRED_NAVIGATION_STATE,
} from '@/app/authRequiredNavigation';
import type { UserProfile } from '@/lib/authContext';
import {
  createCommunityComment,
  createCommunityPost,
  deleteCommunityComment,
  deleteCommunityPost,
  getCommunityProfile,
  listCommunityComments,
  listCommunityPosts,
  reportCommunityPost,
  saveCommunityProfile,
  toggleCommunityLike,
  updateCommunityComment,
  updateCommunityPost,
  type CommunityCategory,
  type CommunityComment,
  type CommunityPost,
  type CommunityPostInput,
  type CommunityProfile,
  type CommunityReportReason,
} from '@/services/communityService';

const categories: Array<{ id: 'all' | CommunityCategory; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'experience', label: '경험과 노하우' },
  { id: 'project', label: '프로젝트 이야기' },
  { id: 'question', label: '질문과 답변' },
];
const emptyDraft: CommunityPostInput = { category: 'experience', content: '', title: '' };

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date);
}

function authorLabel(item: Pick<CommunityPost, 'authorName'>) {
  return item.authorName || '익명 회원';
}

export function CommunityBoard({ user }: { user: UserProfile | null }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [category, setCategory] = useState<'all' | CommunityCategory>('all');
  const [draft, setDraft] = useState<CommunityPostInput>(emptyDraft);
  const [comment, setComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [editingId, setEditingId] = useState('');
  const [deletePending, setDeletePending] = useState(false);
  const [reportReason, setReportReason] = useState<CommunityReportReason | ''>('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [communityProfile, setCommunityProfile] = useState<CommunityProfile | null>(null);
  const [profileOwnerId, setProfileOwnerId] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const userId = user?.uid || '';
  const profileReady = !userId || profileOwnerId === userId;

  const selectedPost = posts.find((post) => post.id === selectedId) ?? null;
  const visiblePosts = useMemo(
    () => posts.filter((post) => category === 'all' || post.category === category),
    [category, posts],
  );

  useEffect(() => {
    let active = true;
    listCommunityPosts()
      .then((items) => {
        if (!active) return;
        setPosts(items);
        setSelectedId(items[0]?.id || '');
      })
      .catch((error: Error) => active && setMessage(error.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getCommunityProfile()
      .then((profile) => {
        if (!active) return;
        setCommunityProfile(profile);
        setNicknameDraft(profile?.nickname || '');
      })
      .catch((error: Error) => active && setMessage(error.message))
      .finally(() => active && setProfileOwnerId(userId));
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    listCommunityComments(selectedId)
      .then((items) => active && setComments(items))
      .catch((error: Error) => active && setMessage(error.message));
    return () => {
      active = false;
    };
  }, [selectedId]);

  const requireParticipationProfile = () => {
    if (!user) {
      setMessage('글쓰기와 참여는 로그인 후 이용할 수 있습니다.');
      return false;
    }
    if (!profileReady) {
      setMessage('활동명을 확인하고 있습니다. 잠시만 기다려 주세요.');
      return false;
    }
    if (communityProfile) return true;
    setNicknameOpen(true);
    setMessage('커뮤니티에서 사용할 익명 활동명을 먼저 설정해 주세요.');
    return false;
  };

  const validateNicknameDraft = () => {
    const nickname = nicknameDraft.normalize('NFKC').trim().replace(/\s+/g, ' ');
    const length = Array.from(nickname).length;
    const error =
      length < 2 || length > 12
        ? '활동명은 2자 이상 12자 이하로 입력해 주세요.'
        : !/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 ]+$/.test(nickname)
          ? '한글, 영문, 숫자만 사용할 수 있습니다.'
          : '';
    setNicknameError(error);
    return error ? '' : nickname;
  };

  const saveNickname = async () => {
    const nickname = validateNicknameDraft();
    if (!nickname || nicknameSaving) return;
    setNicknameSaving(true);
    try {
      const profile = await saveCommunityProfile(nickname);
      setCommunityProfile(profile);
      setProfileOwnerId(userId);
      setNicknameDraft(profile.nickname);
      setNicknameOpen(false);
      setNicknameError('');
      setPosts((current) =>
        current.map((post) => (post.ownedByMe ? { ...post, authorName: profile.nickname } : post)),
      );
      setComments((current) =>
        current.map((item) => (item.ownedByMe ? { ...item, authorName: profile.nickname } : item)),
      );
      setMessage(`활동명을 '${profile.nickname}'으로 저장했습니다.`);
    } catch (error) {
      setNicknameError(error instanceof Error ? error.message : '활동명을 저장하지 못했습니다.');
    } finally {
      setNicknameSaving(false);
    }
  };

  const selectPost = (postId: string) => {
    setComments([]);
    cancelEditComment();
    setSelectedId(postId);
  };

  const chooseCategory = (nextCategory: 'all' | CommunityCategory) => {
    setCategory(nextCategory);
    const currentSelectionIsVisible = posts.some(
      (post) =>
        post.id === selectedId && (nextCategory === 'all' || post.category === nextCategory),
    );
    if (currentSelectionIsVisible) return;
    selectPost(
      posts.find((post) => nextCategory === 'all' || post.category === nextCategory)?.id || '',
    );
  };

  const moveToLogin = () => {
    void navigate(createLoginRedirectPath('/community'), {
      state: LOGIN_REQUIRED_NAVIGATION_STATE,
    });
  };

  const openComposer = (post?: CommunityPost) => {
    if (!requireParticipationProfile()) return;
    setEditingId(post?.id || '');
    setDraft(
      post
        ? { category: post.category, content: post.content, title: post.title }
        : { ...emptyDraft, category: category === 'all' ? 'experience' : category },
    );
    setComposerOpen(true);
    setMessage('');
  };

  const savePost = async () => {
    if (saving || !requireParticipationProfile()) return;
    if (draft.title.trim().length < 4 || draft.content.trim().length < 10) {
      return setMessage('제목은 4자 이상, 내용은 10자 이상 입력해 주세요.');
    }
    setSaving(true);
    try {
      const saved = editingId
        ? await updateCommunityPost(editingId, draft)
        : await createCommunityPost(draft);
      setPosts((current) =>
        editingId
          ? current.map((post) => (post.id === saved.id ? saved : post))
          : [saved, ...current],
      );
      setSelectedId(saved.id);
      setComposerOpen(false);
      setMessage(editingId ? '게시글을 수정했습니다.' : '게시글을 등록했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '게시글을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const removePost = async () => {
    if (!selectedPost || saving) return;
    setSaving(true);
    try {
      await deleteCommunityPost(selectedPost.id);
      const remaining = posts.filter((post) => post.id !== selectedPost.id);
      setPosts(remaining);
      setSelectedId(remaining[0]?.id || '');
      setComments([]);
      setDeletePending(false);
      setMessage('게시글을 삭제했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '게시글을 삭제하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const likePost = async () => {
    if (!selectedPost || !requireParticipationProfile()) return;
    try {
      const result = await toggleCommunityLike(selectedPost.id);
      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPost.id
            ? { ...post, likedByMe: result.liked, likeCount: result.likeCount }
            : post,
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '공감을 저장하지 못했습니다.');
    }
  };

  const saveComment = async () => {
    if (!selectedPost || !requireParticipationProfile() || saving) return;
    if (comment.trim().length < 2) return setMessage('댓글을 2자 이상 입력해 주세요.');
    setSaving(true);
    try {
      const saved = await createCommunityComment(selectedPost.id, comment);
      setComments((current) => [...current, saved]);
      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPost.id ? { ...post, commentCount: post.commentCount + 1 } : post,
        ),
      );
      setComment('');
      setMessage('댓글을 등록했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '댓글을 등록하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const removeComment = async (commentId: string) => {
    if (!selectedPost) return;
    try {
      await deleteCommunityComment(selectedPost.id, commentId);
      setComments((current) => current.filter((item) => item.id !== commentId));
      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPost.id
            ? { ...post, commentCount: Math.max(0, post.commentCount - 1) }
            : post,
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '댓글을 삭제하지 못했습니다.');
    }
  };

  const startEditComment = (item: CommunityComment) => {
    setEditingCommentId(item.id);
    setEditingCommentContent(item.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const saveEditedComment = async (commentId: string) => {
    if (!selectedPost || !requireParticipationProfile()) return;
    const content = editingCommentContent.trim();
    if (content.length < 2) {
      setMessage('댓글을 2자 이상 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCommunityComment(selectedPost.id, commentId, content);
      setComments((current) =>
        current.map((item) => (item.id === commentId ? updated : item)),
      );
      cancelEditComment();
      setMessage('댓글을 수정했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '댓글을 수정하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const submitReport = async () => {
    if (!selectedPost || !reportReason || !requireParticipationProfile()) return;
    try {
      await reportCommunityPost(selectedPost.id, reportReason);
      setReportReason('');
      setMessage('신고가 접수되었습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '신고를 접수하지 못했습니다.');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#D8D1C2] pb-7">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.025em] text-[#173F3A] sm:text-4xl">
            이어잡 커뮤니티
          </h1>
          <p className="mt-2 text-sm font-medium text-[#53645F] sm:text-base">
            경험을 나누고 프로젝트에 관해 묻고 답하는 공간입니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#C9D6D2] bg-white px-3 text-sm font-extrabold text-[#173F3A] hover:bg-[#F2F7F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
              disabled={!profileReady}
              onClick={() => {
                setNicknameDraft(communityProfile?.nickname || '');
                setNicknameError('');
                setNicknameOpen(true);
              }}
              type="button"
            >
              <UserRound aria-hidden="true" className="size-4" />
              {!profileReady ? '활동명 확인 중' : communityProfile?.nickname || '활동명 설정'}
            </button>
          ) : null}
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173F3A] px-4 text-sm font-extrabold text-white hover:bg-[#21544E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.97]"
            onClick={() => openComposer()}
            type="button"
          >
            <PenLine aria-hidden="true" className="size-4" /> 글쓰기
          </button>
        </div>
      </div>

      {message ? (
        <p
          className="mt-4 rounded-xl bg-[#E6F0ED] px-4 py-3 text-sm font-bold text-[#173F3A]"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {nicknameOpen ? (
        <section
          aria-labelledby="community-nickname-heading"
          className="mt-6 rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(23,63,58,0.08)]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black" id="community-nickname-heading">
                익명 활동명
              </h2>
              <p className="mt-1 text-sm font-medium text-[#53645F]">
                게시글과 댓글에는 이름 대신 활동명만 표시됩니다.
              </p>
            </div>
            <button
              aria-label="활동명 설정 닫기"
              className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-[#F2F7F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
              onClick={() => setNicknameOpen(false)}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label
              className="grid flex-1 gap-2 text-sm font-extrabold"
              htmlFor="community-nickname"
            >
              활동명
              <input
                aria-describedby="community-nickname-guide community-nickname-error"
                aria-invalid={Boolean(nicknameError)}
                className={`h-12 rounded-xl border bg-white px-3 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${nicknameError ? 'border-rose-600 focus-visible:ring-rose-600' : 'border-[#D8D1C2] focus-visible:ring-[#173F3A]'}`}
                id="community-nickname"
                maxLength={12}
                onBlur={validateNicknameDraft}
                onChange={(event) => {
                  setNicknameDraft(event.target.value);
                  if (nicknameError) setNicknameError('');
                }}
                placeholder="예: 경험나눔이"
                value={nicknameDraft}
              />
            </label>
            <button
              className="min-h-12 rounded-xl bg-[#173F3A] px-5 text-sm font-extrabold text-white hover:bg-[#21544E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
              disabled={nicknameSaving}
              onClick={() => void saveNickname()}
              type="button"
            >
              {nicknameSaving ? '저장 중' : '활동명 저장'}
            </button>
          </div>
          <p className="mt-2 text-xs font-medium text-[#53645F]" id="community-nickname-guide">
            2~12자, 한글·영문·숫자 사용 가능
          </p>
          <p className="mt-2 min-h-5 text-sm font-bold text-rose-700" id="community-nickname-error">
            {nicknameError}
          </p>
        </section>
      ) : null}

      {composerOpen ? (
        <section
          className="mt-6 rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(23,63,58,0.08)]"
          aria-label={editingId ? '게시글 수정' : '새 글 작성'}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">{editingId ? '게시글 수정' : '새 글 작성'}</h2>
            <button
              aria-label="글쓰기 닫기"
              className="grid size-11 place-items-center rounded-xl hover:bg-[#F2F7F5] focus-visible:ring-2 focus-visible:ring-[#173F3A]"
              onClick={() => setComposerOpen(false)}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-extrabold">
              게시판
              <select
                className="h-12 rounded-xl border border-[#D8D1C2] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value as CommunityCategory,
                  }))
                }
                value={draft.category}
              >
                {categories.slice(1).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-extrabold">
              제목
              <input
                className="h-12 rounded-xl border border-[#D8D1C2] px-3 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2"
                maxLength={80}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="내용을 알 수 있는 제목"
                value={draft.title}
              />
            </label>
            <label className="grid gap-2 text-sm font-extrabold">
              내용
              <textarea
                className="min-h-36 resize-y rounded-xl border border-[#D8D1C2] p-3 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2"
                maxLength={2000}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="개인정보나 연락처는 작성하지 마세요"
                value={draft.content}
              />
            </label>
            <button
              className="ml-auto min-h-11 rounded-xl bg-[#F06B4F] px-5 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85039] focus-visible:ring-offset-2 disabled:opacity-50"
              disabled={saving}
              onClick={() => void savePost()}
              type="button"
            >
              {saving ? '저장 중' : '글 저장'}
            </button>
          </div>
        </section>
      ) : null}

      <nav aria-label="커뮤니티 게시판" className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {categories.map((item) => (
          <button
            aria-current={category === item.id ? 'page' : undefined}
            className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-extrabold focus-visible:ring-2 focus-visible:ring-[#173F3A] ${category === item.id ? 'bg-[#173F3A] text-white' : 'bg-white text-[#53645F] hover:bg-[#E6F0ED]'}`}
            key={item.id}
            onClick={() => chooseCategory(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
        <section aria-label="게시글 목록" className="overflow-hidden rounded-2xl bg-white">
          {loading ? (
            <p className="p-6 text-sm font-bold text-[#53645F]" role="status">
              게시글을 불러오는 중입니다.
            </p>
          ) : visiblePosts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-black">아직 게시글이 없습니다.</p>
              <button
                className="mt-3 min-h-11 rounded-lg px-2 text-sm font-extrabold text-[#173F3A] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                onClick={() => openComposer()}
                type="button"
              >
                첫 글 작성하기
              </button>
            </div>
          ) : (
            visiblePosts.map((post) => (
              <button
                aria-current={post.id === selectedId ? 'true' : undefined}
                className={`block w-full border-b border-[#E8E2D6] p-5 text-left last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#173F3A] ${post.id === selectedId ? 'bg-[#EAF2EF]' : 'hover:bg-[#FAF7F2]'}`}
                key={post.id}
                onClick={() => selectPost(post.id)}
                type="button"
              >
                <span className="text-xs font-extrabold text-[#C85039]">
                  {categories.find((item) => item.id === post.category)?.label}
                </span>
                <strong className="mt-1 block line-clamp-2">{post.title}</strong>
                <span className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[#64716D]">
                  <span>{authorLabel(post)}</span>
                  <span>{dateLabel(post.createdAt)}</span>
                  <span>공감 {post.likeCount}</span>
                  <span>댓글 {post.commentCount}</span>
                </span>
              </button>
            ))
          )}
        </section>

        <section aria-label="게시글 내용" className="min-h-80 rounded-2xl bg-white p-5 sm:p-7">
          {!selectedPost ? (
            <div className="grid min-h-64 place-items-center text-sm font-bold text-[#64716D]">
              게시글을 선택해 주세요.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-[#E8E2D6] pb-5">
                <div>
                  <span className="text-xs font-extrabold text-[#C85039]">
                    {categories.find((item) => item.id === selectedPost.category)?.label}
                  </span>
                  <h2 className="mt-1 text-2xl font-black">{selectedPost.title}</h2>
                  <p className="mt-2 text-sm font-semibold text-[#64716D]">
                    {authorLabel(selectedPost)} · {dateLabel(selectedPost.createdAt)}
                  </p>
                </div>
                {selectedPost.ownedByMe ? (
                  <div className="flex">
                    <button
                      aria-label="게시글 수정"
                      className="grid size-11 place-items-center rounded-lg hover:bg-[#F2F7F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                      onClick={() => openComposer(selectedPost)}
                      type="button"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      aria-label="게시글 삭제"
                      className="grid size-11 place-items-center rounded-lg text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
                      onClick={() => setDeletePending(true)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
              {deletePending ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-900">
                  <span>게시글과 댓글을 삭제할까요?</span>
                  <div>
                    <button
                      className="min-h-11 rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
                      onClick={() => setDeletePending(false)}
                      type="button"
                    >
                      취소
                    </button>
                    <button
                      className="min-h-11 rounded-lg bg-rose-700 px-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2"
                      onClick={() => void removePost()}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ) : null}
              <p className="min-h-32 whitespace-pre-wrap py-7 text-[15px] font-medium leading-7">
                {selectedPost.content}
              </p>
              <div className="flex flex-wrap items-center gap-2 border-y border-[#E8E2D6] py-3">
                <button
                  aria-pressed={selectedPost.likedByMe}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] ${selectedPost.likedByMe ? 'bg-[#FCE8E3] text-[#C85039]' : 'bg-[#F2F7F5] text-[#173F3A]'}`}
                  onClick={() => void likePost()}
                  type="button"
                >
                  <Heart
                    aria-hidden="true"
                    className="size-4"
                    fill={selectedPost.likedByMe ? 'currentColor' : 'none'}
                  />{' '}
                  공감 {selectedPost.likeCount}
                </button>
                <span className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-bold text-[#53645F]">
                  <MessageCircle aria-hidden="true" className="size-4" /> 댓글{' '}
                  {selectedPost.commentCount}
                </span>
                {!selectedPost.ownedByMe ? (
                  <button
                    className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-[#64716D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                    onClick={() => setReportReason('spam')}
                    type="button"
                  >
                    <Flag aria-hidden="true" className="size-4" /> 신고
                  </button>
                ) : null}
              </div>
              {reportReason ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#FAF7F2] p-3">
                  <label className="text-sm font-extrabold" htmlFor="report-reason">
                    신고 사유
                  </label>
                  <select
                    className="h-11 rounded-lg border border-[#D8D1C2] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                    id="report-reason"
                    onChange={(event) =>
                      setReportReason(event.target.value as CommunityReportReason)
                    }
                    value={reportReason}
                  >
                    <option value="spam">광고·도배</option>
                    <option value="abuse">욕설·비방</option>
                    <option value="privacy">개인정보 노출</option>
                    <option value="other">기타</option>
                  </select>
                  <button
                    className="min-h-11 rounded-lg bg-[#17212B] px-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2"
                    onClick={() => void submitReport()}
                    type="button"
                  >
                    신고 접수
                  </button>
                  <button
                    className="min-h-11 rounded-lg px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                    onClick={() => setReportReason('')}
                    type="button"
                  >
                    취소
                  </button>
                </div>
              ) : null}
              <div className="mt-7">
                <h3 className="text-lg font-black">댓글</h3>
                {user ? (
                  <div className="mt-3 flex gap-2">
                    <label className="sr-only" htmlFor="community-comment">
                      댓글 내용
                    </label>
                    <input
                      className="h-12 min-w-0 flex-1 rounded-xl border border-[#D8D1C2] px-3 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                      id="community-comment"
                      maxLength={500}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="서로를 존중하는 댓글을 남겨주세요"
                      value={comment}
                    />
                    <button
                      aria-label="댓글 등록"
                      className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#173F3A] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2"
                      onClick={() => void saveComment()}
                      type="button"
                    >
                      <Send aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="mt-3 min-h-11 rounded-lg px-2 text-sm font-extrabold text-[#173F3A] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                    onClick={moveToLogin}
                    type="button"
                  >
                    로그인하고 댓글 작성하기
                  </button>
                )}
                <div className="mt-4">
                  {comments.length === 0 ? (
                    <p className="py-5 text-sm font-semibold text-[#64716D]">
                      아직 댓글이 없습니다.
                    </p>
                  ) : (
                    comments.map((item) => (
                      <article className="border-t border-[#E8E2D6] py-4" key={item.id}>
                        <div className="flex items-start justify-between">
                          <div>
                            <strong className="text-sm">{authorLabel(item)}</strong>
                            <span className="ml-2 text-xs text-[#64716D]">
                              {dateLabel(item.createdAt)}
                            </span>
                          </div>
                          {item.ownedByMe ? (
                            <div className="flex items-center gap-1">
                              <button
                                className="min-h-11 rounded-lg px-2 text-xs font-bold text-[#173F3A] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                                onClick={() => startEditComment(item)}
                                type="button"
                              >
                                수정
                              </button>
                              <button
                                className="min-h-11 rounded-lg px-2 text-xs font-bold text-rose-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
                                onClick={() => void removeComment(item.id)}
                                type="button"
                              >
                                삭제
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {editingCommentId === item.id ? (
                          <div className="mt-2 space-y-2">
                            <label className="sr-only" htmlFor={`edit-comment-${item.id}`}>
                              댓글 수정 내용
                            </label>
                            <input
                              className="h-11 w-full rounded-lg border border-[#D8D1C2] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                              id={`edit-comment-${item.id}`}
                              maxLength={500}
                              onChange={(event) => setEditingCommentContent(event.target.value)}
                              value={editingCommentContent}
                            />
                            <div className="flex gap-2">
                              <button
                                className="min-h-9 rounded-lg bg-[#173F3A] px-3 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                                disabled={saving}
                                onClick={() => void saveEditedComment(item.id)}
                                type="button"
                              >
                                저장
                              </button>
                              <button
                                className="min-h-9 rounded-lg border border-[#D8D1C2] bg-white px-3 text-xs font-bold text-[#53645F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
                                onClick={cancelEditComment}
                                type="button"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{item.content}</p>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
