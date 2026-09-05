import {
  Check,
  ChevronDown,
  CornerDownRight,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  createLoginRedirectPath,
  LOGIN_REQUIRED_NAVIGATION_STATE,
} from '@/app/authRequiredNavigation';
import type { UserProfile } from '@/lib/authContext';
import { cn } from '@/lib/utils';
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

const reportReasons: Array<{ id: CommunityReportReason; label: string }> = [
  { id: 'spam', label: '광고·도배' },
  { id: 'abuse', label: '욕설·비방' },
  { id: 'privacy', label: '개인정보 노출' },
  { id: 'other', label: '기타' },
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
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyTargetAuthor, setReplyTargetAuthor] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [editingId, setEditingId] = useState('');
  const [deletePending, setDeletePending] = useState(false);
  const [reportReason, setReportReason] = useState<CommunityReportReason | ''>('');
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);
  const reportDropdownRef = useRef<HTMLDivElement>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
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

  const { rootComments, repliesMap } = useMemo(() => {
    const roots: CommunityComment[] = [];
    const replies = new Map<string, CommunityComment[]>();
    for (const item of comments) {
      if (item.parentId) {
        const list = replies.get(item.parentId) || [];
        list.push(item);
        replies.set(item.parentId, list);
      } else {
        roots.push(item);
      }
    }
    return { rootComments: roots, repliesMap: replies };
  }, [comments]);

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
    if (!categoryDropdownOpen && !reportDropdownOpen) return undefined;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (categoryDropdownOpen && !categoryDropdownRef.current?.contains(target)) {
        setCategoryDropdownOpen(false);
      }
      if (reportDropdownOpen && !reportDropdownRef.current?.contains(target)) {
        setReportDropdownOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCategoryDropdownOpen(false);
        setReportDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [categoryDropdownOpen, reportDropdownOpen]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getCommunityProfile()
      .then((profile) => {
        if (!active) return;
        setCommunityProfile(profile);
        setNicknameDraft(profile?.nickname || '');
      })
      .catch((error: Error) => {
        if (active && !error.message.includes('로그인')) {
          setMessage(error.message);
        }
      })
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

  const moveToLogin = () => {
    void navigate(createLoginRedirectPath('/community'), {
      state: LOGIN_REQUIRED_NAVIGATION_STATE,
    });
  };

  const requireParticipationProfile = () => {
    if (!user) {
      moveToLogin();
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
    cancelReply();
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

  const openComposer = (post?: CommunityPost) => {
    if (!requireParticipationProfile()) return;
    setEditingId(post?.id || '');
    setDraft(
      post
        ? { category: post.category, content: post.content, title: post.title }
        : { ...emptyDraft, category: category === 'all' ? 'experience' : category },
    );
    setComposerOpen(true);
    setCategoryDropdownOpen(false);
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

  const startReply = (parentComment: CommunityComment, targetComment?: CommunityComment) => {
    if (!user) {
      moveToLogin();
      return;
    }
    if (!requireParticipationProfile()) return;
    const rootId = parentComment.parentId || parentComment.id;
    setReplyingToCommentId(rootId);
    setReplyTargetAuthor(targetComment ? authorLabel(targetComment) : authorLabel(parentComment));
    setReplyContent('');
  };

  const cancelReply = () => {
    setReplyingToCommentId(null);
    setReplyTargetAuthor('');
    setReplyContent('');
  };

  const saveReply = async (rootCommentId: string) => {
    if (!selectedPost || !requireParticipationProfile() || saving) return;
    if (replyContent.trim().length < 2) return setMessage('답글을 2자 이상 입력해 주세요.');
    setSaving(true);
    try {
      const saved = await createCommunityComment(
        selectedPost.id,
        replyContent,
        rootCommentId,
        replyTargetAuthor,
      );
      setComments((current) => [...current, saved]);
      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPost.id ? { ...post, commentCount: post.commentCount + 1 } : post,
        ),
      );
      cancelReply();
      setMessage('답글을 등록했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '답글을 등록하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const removeComment = async (commentId: string) => {
    if (!selectedPost) return;
    try {
      await deleteCommunityComment(selectedPost.id, commentId);
      const targetComment = comments.find((item) => item.id === commentId);
      const isRoot = !targetComment?.parentId;
      const childCount = isRoot
        ? comments.filter((item) => item.parentId === commentId).length
        : 0;
      const totalDeleted = 1 + childCount;

      setComments((current) =>
        current.filter((item) => item.id !== commentId && item.parentId !== commentId),
      );
      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPost.id
            ? { ...post, commentCount: Math.max(0, post.commentCount - totalDeleted) }
            : post,
        ),
      );
      if (replyingToCommentId === commentId) {
        cancelReply();
      }
      setMessage('댓글을 삭제했습니다.');
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
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#C9D6D2] bg-white px-3 text-sm font-extrabold text-[#173F3A] hover:bg-[#F2F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 transition-all cursor-pointer"
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
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173F3A] px-4 text-sm font-extrabold text-white hover:bg-[#21544E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] focus-visible:ring-offset-2 active:scale-[0.97] transition-all cursor-pointer"
            onClick={() => openComposer()}
            type="button"
          >
            <PenLine aria-hidden="true" className="size-4" /> 글쓰기
          </button>
        </div>
      </div>

      {message && !message.includes('로그인') ? (
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
              className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-[#F2F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] transition-colors cursor-pointer"
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
                className={cn(
                  'h-12 rounded-xl border bg-white px-3.5 text-sm font-medium text-[#17212B] placeholder:text-slate-400 focus:outline-none transition-all',
                  nicknameError ? 'border-rose-600 focus:border-rose-600' : 'border-[#D8D1C2] focus:border-[#B8AF9C]',
                )}
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
              className="min-h-12 rounded-xl bg-[#173F3A] px-5 text-sm font-extrabold text-white hover:bg-[#21544E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 transition-all cursor-pointer"
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
          className="mt-6 rounded-2xl border border-[#E0D9C8] bg-white p-5 shadow-[0_4px_12px_rgba(23,63,58,0.08)] sm:p-6"
          aria-label={editingId ? '게시글 수정' : '새 글 작성'}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#17212B]">{editingId ? '게시글 수정' : '새 글 작성'}</h2>
            <button
              aria-label="글쓰기 닫기"
              className="grid size-11 place-items-center rounded-xl hover:bg-[#F2F7F5] focus:outline-none transition-colors cursor-pointer"
              onClick={() => {
                setComposerOpen(false);
                setCategoryDropdownOpen(false);
              }}
              type="button"
            >
              <X aria-hidden="true" className="size-5 text-[#53645F]" />
            </button>
          </div>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2 text-sm font-extrabold text-[#17212B]" ref={categoryDropdownRef}>
              <span>게시판</span>
              <div className="relative">
                <button
                  type="button"
                  id="community-category-select"
                  aria-haspopup="listbox"
                  aria-expanded={categoryDropdownOpen}
                  aria-label={`게시판 선택: ${categories.find((item) => item.id === draft.category)?.label || '경험과 노하우'}`}
                  onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                  className={cn(
                    'flex h-12 w-full items-center justify-between rounded-xl border border-[#D8D1C2] bg-white px-4 text-sm font-extrabold text-[#17212B] transition-all cursor-pointer',
                    'hover:border-[#B8AF9C] focus:outline-none focus:border-[#B8AF9C]',
                    categoryDropdownOpen && 'border-[#B8AF9C] shadow-2xs',
                  )}
                >
                  <span>{categories.find((item) => item.id === draft.category)?.label || '경험과 노하우'}</span>
                  <ChevronDown
                    className={cn(
                      'size-4 text-slate-500 transition-transform duration-200',
                      categoryDropdownOpen && 'rotate-180 text-[#17212B]',
                    )}
                  />
                </button>

                {categoryDropdownOpen ? (
                  <div
                    aria-label="게시판 카테고리 목록"
                    className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-2xl border border-[#E0D9C8] bg-white p-1.5 shadow-[0_8px_20px_rgba(23,63,58,0.12)] animate-in fade-in zoom-in-95 duration-100"
                    role="listbox"
                  >
                    {categories.slice(1).map((item) => {
                      const isSelected = item.id === draft.category;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setDraft((current) => ({
                              ...current,
                              category: item.id as CommunityCategory,
                            }));
                            setCategoryDropdownOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-extrabold transition-all cursor-pointer',
                            isSelected
                              ? 'bg-[#FAF7F2] text-[#F06B4F] shadow-2xs'
                              : 'text-[#17212B] hover:bg-[#FAF7F2]',
                          )}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <span>{item.label}</span>
                          {isSelected ? <Check className="size-4 text-[#F06B4F]" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <label className="grid gap-2 text-sm font-extrabold text-[#17212B]">
              제목
              <input
                className="h-12 rounded-xl border border-[#D8D1C2] bg-white px-4 text-sm font-medium text-[#17212B] placeholder:text-slate-400 focus:outline-none focus:border-[#B8AF9C] transition-all"
                maxLength={80}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="내용을 알 수 있는 제목"
                value={draft.title}
              />
            </label>
            <label className="grid gap-2 text-sm font-extrabold text-[#17212B]">
              내용
              <textarea
                className="min-h-36 resize-y rounded-xl border border-[#D8D1C2] bg-white p-4 text-sm font-medium text-[#17212B] placeholder:text-slate-400 focus:outline-none focus:border-[#B8AF9C] transition-all leading-relaxed"
                maxLength={2000}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="개인정보나 연락처는 작성하지 마세요"
                value={draft.content}
              />
            </label>
            <button
              className="ml-auto min-h-11 rounded-xl bg-[#F06B4F] px-5 text-sm font-extrabold text-white hover:bg-[#E05B3F] focus:outline-none active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-2xs transition-all"
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
            className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] transition-all cursor-pointer ${category === item.id ? 'bg-[#173F3A] text-white shadow-2xs' : 'bg-white text-[#53645F] hover:bg-[#E6F0ED]'}`}
            key={item.id}
            onClick={() => chooseCategory(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.4fr)]">
        <section
          aria-label="게시글 목록"
          className="flex min-h-[420px] md:min-h-[500px] flex-col overflow-hidden rounded-2xl border border-[#E8E2D6] bg-white shadow-2xs"
        >
          {loading ? (
            <div className="my-auto grid place-items-center p-6 text-sm font-bold text-[#53645F]" role="status">
              게시글을 불러오는 중입니다.
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="my-auto p-8 text-center">
              <p className="font-black text-[#17212B]">아직 게시글이 없습니다.</p>
              <button
                className="mt-3 min-h-11 rounded-lg px-2 text-sm font-extrabold text-[#173F3A] underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C]"
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
                className={`block w-full border-b border-[#E8E2D6] p-5 text-left last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B8AF9C] transition-colors cursor-pointer ${post.id === selectedId ? 'bg-[#EAF2EF]' : 'hover:bg-[#FAF7F2]'}`}
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

        <section
          aria-label="게시글 내용"
          className="flex min-h-[420px] md:min-h-[500px] flex-col rounded-2xl border border-[#E8E2D6] bg-white p-5 sm:p-7 shadow-2xs"
        >
          {!selectedPost ? (
            <div className="my-auto grid min-h-64 place-items-center text-sm font-bold text-[#64716D]">
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
                      className="grid size-11 place-items-center rounded-lg hover:bg-[#F2F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C]"
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
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] transition-all cursor-pointer ${selectedPost.likedByMe ? 'bg-[#FCE8E3] text-[#C85039]' : 'bg-[#F2F7F5] text-[#173F3A]'}`}
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
                    className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-[#64716D] hover:text-[#17212B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] transition-colors cursor-pointer"
                    onClick={() => {
                      setReportReason('spam');
                      setReportDropdownOpen(false);
                    }}
                    type="button"
                  >
                    <Flag aria-hidden="true" className="size-4" /> 신고
                  </button>
                ) : null}
              </div>
              {reportReason ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#FAF7F2] p-3">
                  <span className="text-sm font-extrabold text-[#17212B]">신고 사유</span>
                  <div className="relative" ref={reportDropdownRef}>
                    <button
                      type="button"
                      id="report-reason"
                      aria-haspopup="listbox"
                      aria-expanded={reportDropdownOpen}
                      aria-label={`신고 사유 선택: ${reportReasons.find((r) => r.id === reportReason)?.label || '사유 선택'}`}
                      onClick={() => setReportDropdownOpen((prev) => !prev)}
                      className={cn(
                        'flex h-11 min-w-[140px] items-center justify-between gap-2 rounded-xl border border-[#D8D1C2] bg-white px-3.5 text-sm font-bold text-[#17212B] transition-all cursor-pointer',
                        'hover:border-[#B8AF9C] focus:outline-none focus:border-[#B8AF9C]',
                        reportDropdownOpen && 'border-[#B8AF9C] shadow-2xs',
                      )}
                    >
                      <span>{reportReasons.find((r) => r.id === reportReason)?.label || '사유 선택'}</span>
                      <ChevronDown
                        className={cn(
                          'size-4 text-slate-500 transition-transform duration-200',
                          reportDropdownOpen && 'rotate-180 text-[#17212B]',
                        )}
                      />
                    </button>
                    {reportDropdownOpen ? (
                      <div
                        aria-label="신고 사유 목록"
                        className="absolute left-0 top-full z-30 mt-1.5 min-w-[150px] overflow-hidden rounded-2xl border border-[#E0D9C8] bg-white p-1.5 shadow-[0_8px_20px_rgba(23,63,58,0.12)] animate-in fade-in zoom-in-95 duration-100"
                        role="listbox"
                      >
                        {reportReasons.map((item) => {
                          const isSelected = item.id === reportReason;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setReportReason(item.id);
                                setReportDropdownOpen(false);
                              }}
                              className={cn(
                                'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-all cursor-pointer',
                                isSelected
                                  ? 'bg-[#FAF7F2] text-[#F06B4F] shadow-2xs'
                                  : 'text-[#17212B] hover:bg-[#FAF7F2]',
                              )}
                              role="option"
                              aria-selected={isSelected}
                            >
                              <span>{item.label}</span>
                              {isSelected ? <Check className="size-4 text-[#F06B4F]" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="min-h-11 rounded-xl bg-[#17212B] px-4 text-sm font-bold text-white hover:bg-[#2a3847] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] focus-visible:ring-offset-2 transition-all cursor-pointer"
                    onClick={() => void submitReport()}
                    type="button"
                  >
                    신고 접수
                  </button>
                  <button
                    className="min-h-11 rounded-xl px-3 text-sm font-bold text-[#53645F] hover:bg-slate-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] transition-all cursor-pointer"
                    onClick={() => {
                      setReportReason('');
                      setReportDropdownOpen(false);
                    }}
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
                      className="h-12 min-w-0 flex-1 rounded-xl border border-[#D8D1C2] bg-white px-4 text-sm font-medium text-[#17212B] placeholder:text-slate-400 focus:outline-none focus:border-[#B8AF9C] transition-all"
                      id="community-comment"
                      maxLength={500}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="서로를 존중하는 댓글을 남겨주세요"
                      value={comment}
                    />
                    <button
                      aria-label="댓글 등록"
                      className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#173F3A] text-white hover:bg-[#21544E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] focus-visible:ring-offset-2 transition-all cursor-pointer"
                      onClick={() => void saveComment()}
                      type="button"
                    >
                      <Send aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="mt-3 min-h-11 rounded-lg px-2 text-sm font-extrabold text-[#173F3A] underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C]"
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
                    rootComments.map((root) => {
                      const replies = repliesMap.get(root.id) || [];
                      const isReplying = replyingToCommentId === root.id;
                      return (
                        <article className="border-t border-[#E8E2D6] py-4" key={root.id}>
                          <div className="flex items-start justify-between">
                            <div>
                              <strong className="text-sm">{authorLabel(root)}</strong>
                              <span className="ml-2 text-xs text-[#64716D]">
                                {dateLabel(root.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#173F3A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] cursor-pointer"
                                onClick={() => startReply(root)}
                                type="button"
                              >
                                <CornerDownRight aria-hidden="true" className="size-3.5" />
                                답글
                              </button>
                              {root.ownedByMe ? (
                                <>
                                  <button
                                    className="min-h-11 rounded-lg px-2 text-xs font-bold text-[#173F3A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] cursor-pointer"
                                    onClick={() => startEditComment(root)}
                                    type="button"
                                  >
                                    수정
                                  </button>
                                  <button
                                    className="min-h-11 rounded-lg px-2 text-xs font-bold text-rose-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 cursor-pointer"
                                    onClick={() => void removeComment(root.id)}
                                    type="button"
                                  >
                                    삭제
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                          {editingCommentId === root.id ? (
                            <div className="mt-2 space-y-2">
                              <label className="sr-only" htmlFor={`edit-comment-${root.id}`}>
                                댓글 수정 내용
                              </label>
                              <input
                                className="h-11 w-full rounded-xl border border-[#D8D1C2] bg-white px-3.5 text-sm font-medium text-[#17212B] focus:outline-none focus:border-[#B8AF9C] transition-all"
                                id={`edit-comment-${root.id}`}
                                maxLength={500}
                                onChange={(event) => setEditingCommentContent(event.target.value)}
                                value={editingCommentContent}
                              />
                              <div className="flex gap-2">
                                <button
                                  className="min-h-9 rounded-lg bg-[#173F3A] px-3 text-xs font-bold text-white hover:bg-[#21544E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] cursor-pointer"
                                  disabled={saving}
                                  onClick={() => void saveEditedComment(root.id)}
                                  type="button"
                                >
                                  저장
                                </button>
                                <button
                                  className="min-h-9 rounded-lg border border-[#D8D1C2] bg-white px-3 text-xs font-bold text-[#53645F] hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] cursor-pointer"
                                  onClick={cancelEditComment}
                                  type="button"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#17212B]">{root.content}</p>
                          )}

                          {replies.length > 0 ? (
                            <div className="mt-3 space-y-2.5 border-l-2 border-[#D8D1C2] pl-3.5 sm:pl-4 sm:ml-2">
                              {replies.map((reply) => (
                                <div
                                  key={reply.id}
                                  className="rounded-xl bg-[#F7F5F0] p-3 text-sm"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <CornerDownRight aria-hidden="true" className="size-3.5 text-[#53645F] shrink-0" />
                                      <strong className="text-xs font-bold sm:text-sm">{authorLabel(reply)}</strong>
                                      {reply.replyToAuthorName ? (
                                        <span className="rounded bg-[#E6F0ED] px-1.5 py-0.5 text-xs font-bold text-[#173F3A]">
                                          @{reply.replyToAuthorName}
                                        </span>
                                      ) : null}
                                      <span className="text-xs text-[#64716D]">
                                        {dateLabel(reply.createdAt)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#173F3A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] cursor-pointer"
                                        onClick={() => startReply(root, reply)}
                                        type="button"
                                      >
                                        <CornerDownRight aria-hidden="true" className="size-3" />
                                        답글
                                      </button>
                                      {reply.ownedByMe ? (
                                        <>
                                          <button
                                            className="min-h-9 rounded-lg px-2 text-xs font-bold text-[#173F3A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] cursor-pointer"
                                            onClick={() => startEditComment(reply)}
                                            type="button"
                                          >
                                            수정
                                          </button>
                                          <button
                                            className="min-h-9 rounded-lg px-2 text-xs font-bold text-rose-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 cursor-pointer"
                                            onClick={() => void removeComment(reply.id)}
                                            type="button"
                                          >
                                            삭제
                                          </button>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>

                                  {editingCommentId === reply.id ? (
                                    <div className="mt-2 space-y-2">
                                      <label className="sr-only" htmlFor={`edit-comment-${reply.id}`}>
                                        답글 수정 내용
                                      </label>
                                      <input
                                        className="h-10 w-full rounded-xl border border-[#D8D1C2] bg-white px-3 text-sm font-medium text-[#17212B] focus:outline-none focus:border-[#B8AF9C] transition-all"
                                        id={`edit-comment-${reply.id}`}
                                        maxLength={500}
                                        onChange={(event) => setEditingCommentContent(event.target.value)}
                                        value={editingCommentContent}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          className="min-h-8 rounded-lg bg-[#173F3A] px-3 text-xs font-bold text-white hover:bg-[#21544E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] cursor-pointer"
                                          disabled={saving}
                                          onClick={() => void saveEditedComment(reply.id)}
                                          type="button"
                                        >
                                          저장
                                        </button>
                                        <button
                                          className="min-h-8 rounded-lg border border-[#D8D1C2] bg-white px-3 text-xs font-bold text-[#53645F] hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] cursor-pointer"
                                          onClick={cancelEditComment}
                                          type="button"
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-[#17212B]">
                                      {reply.content}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {isReplying ? (
                            <div className="mt-3 border-l-2 border-[#173F3A] pl-3.5 sm:pl-4 sm:ml-2">
                              <div className="rounded-xl bg-[#EBF2F0] p-3">
                                <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#173F3A]">
                                  <span>@{replyTargetAuthor} 님에게 답글 작성</span>
                                  <button
                                    className="text-xs font-medium text-[#53645F] hover:underline cursor-pointer"
                                    onClick={cancelReply}
                                    type="button"
                                  >
                                    취소
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <label className="sr-only" htmlFor={`reply-input-${root.id}`}>
                                    답글 내용
                                  </label>
                                  <input
                                    autoFocus
                                    className="h-11 min-w-0 flex-1 rounded-xl border border-[#C9D6D2] bg-white px-3.5 text-sm font-medium text-[#17212B] placeholder:text-slate-400 focus:outline-none focus:border-[#173F3A] transition-all"
                                    id={`reply-input-${root.id}`}
                                    maxLength={500}
                                    onChange={(event) => setReplyContent(event.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        void saveReply(root.id);
                                      }
                                    }}
                                    placeholder={`@${replyTargetAuthor} 님에게 답글을 남겨주세요`}
                                    value={replyContent}
                                  />
                                  <button
                                    aria-label="답글 등록"
                                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-xl bg-[#173F3A] px-3.5 text-xs font-bold text-white hover:bg-[#21544E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8AF9C] focus-visible:ring-offset-2 transition-all cursor-pointer disabled:opacity-50"
                                    disabled={saving}
                                    onClick={() => void saveReply(root.id)}
                                    type="button"
                                  >
                                    <Send aria-hidden="true" className="size-3.5" />
                                    <span>등록</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })
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
