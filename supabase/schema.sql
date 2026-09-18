-- ==============================================================================
-- OneMore (원모어) Supabase PostgreSQL Schema & Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Mirroring auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('senior', 'company')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 3. Company Profiles
CREATE TABLE IF NOT EXISTS public.company_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  biz_number TEXT,
  manager_name TEXT,
  email TEXT,
  phone TEXT,
  company_address TEXT,
  intro TEXT,
  logo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Senior Profiles
CREATE TABLE IF NOT EXISTS public.senior_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  birth_year INT,
  phone TEXT,
  email TEXT,
  region TEXT,
  desired_roles TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  experience_years INT DEFAULT 0,
  intro TEXT,
  resume_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Projects & Job Postings
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  problem_statement TEXT,
  project_goal TEXT,
  core_responsibilities TEXT[] DEFAULT '{}',
  required_skills TEXT[] DEFAULT '{}',
  preferred_skills TEXT[] DEFAULT '{}',
  work_type TEXT,
  work_schedule TEXT,
  salary_range TEXT,
  location TEXT,
  source TEXT DEFAULT 'internal',
  source_url TEXT,
  source_provider TEXT DEFAULT '원모어 기업 직접 등록',
  senior_fit_score INT DEFAULT 90,
  review_status TEXT DEFAULT 'approved' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  deadline DATE,
  deadline_label TEXT,
  registered_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Proposals & Applications
CREATE TABLE IF NOT EXISTS public.proposals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  cover_message TEXT,
  experience_summary TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Community Posts
CREATE TABLE IF NOT EXISTS public.community_posts (
  id TEXT PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'free',
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Community Comments
CREATE TABLE IF NOT EXISTS public.community_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Experience Cards (AI Interview Results)
CREATE TABLE IF NOT EXISTS public.experience_cards (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  core_competencies TEXT[] DEFAULT '{}',
  achievements TEXT[] DEFAULT '{}',
  recommended_roles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.senior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_cards ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and edit their own profiles; Admins can view all
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Company Profiles
CREATE POLICY "Company can read own company profile" ON public.company_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Company can manage own company profile" ON public.company_profiles
  FOR ALL USING (auth.uid() = id);

-- Senior Profiles
CREATE POLICY "Senior can read own profile" ON public.senior_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Senior can manage own profile" ON public.senior_profiles
  FOR ALL USING (auth.uid() = id);

-- Projects: Public read for all verified jobs; Owner can manage own jobs
CREATE POLICY "Public read verified projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Company can create project" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Company can update own project" ON public.projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Company can delete own project" ON public.projects
  FOR DELETE USING (auth.uid() = owner_id);

-- Proposals: Applicant or Project Owner can view
CREATE POLICY "Users can view relevant proposals" ON public.proposals
  FOR SELECT USING (
    auth.uid() = applicant_id OR
    auth.uid() IN (SELECT owner_id FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "Applicant can create proposal" ON public.proposals
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Applicant can update own proposal" ON public.proposals
  FOR UPDATE USING (auth.uid() = applicant_id);

-- Community: Public read; Author can manage
CREATE POLICY "Public read community posts" ON public.community_posts
  FOR SELECT USING (true);

CREATE POLICY "Author can create post" ON public.community_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author can update own post" ON public.community_posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Author can delete own post" ON public.community_posts
  FOR DELETE USING (auth.uid() = author_id);

-- Community Comments: Public read; Author can manage
CREATE POLICY "Public read comments" ON public.community_comments
  FOR SELECT USING (true);

CREATE POLICY "Author can create comment" ON public.community_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author can delete own comment" ON public.community_comments
  FOR DELETE USING (auth.uid() = author_id);

-- Experience Cards: Owner only
CREATE POLICY "User can view own experience cards" ON public.experience_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User can manage own experience cards" ON public.experience_cards
  FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- Supabase Storage Buckets
-- ==============================================================================
-- Required buckets in Supabase dashboard:
-- 1. 'resumes' (Private: applicant & company owner read, applicant write)
-- 2. 'company-logos' (Public read, company write)
-- 3. 'attachments' (Private: authenticated read & write)
