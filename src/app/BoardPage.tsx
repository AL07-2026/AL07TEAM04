import { type FormEvent, useEffect, useState } from 'react';
import { MessageSquarePlus, Send } from 'lucide-react';

import { SiteHeader } from '@/app/wireframe/Ui';
import { useAuth } from '@/lib/authContext';
import {
  createCommunityBoardPost,
  fetchCommunityBoardPosts,
  getCommunityBoardPosts,
  syncCommunityBoardPost,
  type CommunityBoardCategory,
} from '@/services/communityBoardService';

const categories: CommunityBoardCategory[] = ['질문', '서비스 의견', '바라는 점', '기타'];

function formatDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date);
}

export function BoardPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<CommunityBoardCategory>('질문');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState('');
  const [posts, setPosts] = useState(() => getCommunityBoardPosts());

  useEffect(() => {
    void fetchCommunityBoardPosts().then(setPosts);
  }, []);

  const submitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const post = createCommunityBoardPost({
        author: user?.name || '익명 사용자',
        category,
        content,
        title,
      });
      setPosts((currentPosts) => [post, ...currentPosts]);
      void syncCommunityBoardPost(post);
      setTitle('');
      setContent('');
      setNotice('의견을 게시판에 등록했습니다.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '의견을 등록하지 못했습니다.');
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#FAF7F2] text-[#17212B]">
      <SiteHeader role={user?.role} title="이어잡 게시판" />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-5 py-9 sm:px-8 md:px-10 md:py-14">
        <section className="max-w-3xl">
          <p className="text-sm font-extrabold text-[#F06B4F]">이어잡 커뮤니티</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight text-[#17212B] md:text-4xl">질문과 의견을 자유롭게 나눠 주세요</h2>
          <p className="mt-4 text-base leading-relaxed text-[#45556C] md:text-lg">
            서비스 이용 중 궁금한 점, 개선 의견, 이어잡에 바라는 점을 남길 수 있는 열린 게시판입니다.
          </p>
        </section>

        <section aria-labelledby="board-compose-heading" className="border-y border-[#E0D9C8] py-7 md:py-8">
          <div className="mb-5 flex items-center gap-3">
            <MessageSquarePlus className="size-6 text-[#F06B4F]" strokeWidth={1.8} aria-hidden="true" />
            <h3 id="board-compose-heading" className="text-xl font-extrabold md:text-2xl">새 글 작성</h3>
          </div>
          <form className="grid max-w-4xl gap-5" onSubmit={submitPost}>
            <label className="grid gap-2 text-base font-extrabold text-[#173F3A]">
              분류
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CommunityBoardCategory)}
                className="min-h-12 w-full rounded-md border border-[#D4CBB8] bg-white px-3.5 text-base font-semibold text-[#17212B] outline-none focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/20"
              >
                {categories.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-base font-extrabold text-[#173F3A]">
              제목
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="글의 제목을 입력해 주세요"
                className="min-h-12 w-full rounded-md border border-[#D4CBB8] bg-white px-3.5 text-base font-medium text-[#17212B] outline-none placeholder:text-slate-400 focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/20"
              />
            </label>
            <label className="grid gap-2 text-base font-extrabold text-[#173F3A]">
              내용
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="질문이나 의견을 자세히 남겨 주세요"
                className="min-h-36 w-full resize-y rounded-md border border-[#D4CBB8] bg-white p-3.5 text-base font-medium leading-relaxed text-[#17212B] outline-none placeholder:text-slate-400 focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/20"
              />
            </label>
            {notice ? <p aria-live="polite" className="text-base font-bold text-[#173F3A]">{notice}</p> : null}
            <button
              type="submit"
              className="flex min-h-13 w-full items-center justify-center gap-2 rounded-md bg-[#173F3A] px-5 text-base font-extrabold text-white transition-colors hover:bg-[#21544E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F3A] active:scale-[0.98] sm:w-fit"
            >
              <Send className="size-5" strokeWidth={1.8} aria-hidden="true" />
              글 등록하기
            </button>
          </form>
        </section>

        <section aria-labelledby="board-posts-heading" className="pb-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h3 id="board-posts-heading" className="text-xl font-extrabold md:text-2xl">최근 글</h3>
            <span className="text-sm font-bold text-[#45556C]">{posts.length}개</span>
          </div>
          {posts.length === 0 ? (
            <div className="border-y border-[#E0D9C8] py-10 text-center text-base font-medium leading-relaxed text-[#45556C]">
              아직 등록된 글이 없습니다. 첫 의견을 남겨 주세요.
            </div>
          ) : (
            <div className="border-t border-[#E0D9C8]">
              {posts.map((post) => (
                <article key={post.id} className="border-b border-[#E0D9C8] py-6 md:py-7">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-[#45556C]">
                    <span className="text-[#F06B4F]">{post.category}</span>
                    <span>{post.author}</span>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                  <h4 className="mt-2 text-lg font-extrabold text-[#17212B] md:text-xl">{post.title}</h4>
                  <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-[#45556C]">{post.content}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
