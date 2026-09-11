export type PremiumCompany = {
  companyName: string;
  description: string;
  displayOrder: number;
  headline: string;
  hiringFocus: string;
  id: string;
  imageUrl: string;
  industry: string;
  isSample?: boolean;
  location: string;
  websiteUrl?: string;
};

export const initialPremiumCompanies: PremiumCompany[] = [
  {
    companyName: '담은생활연구소',
    description: '생활 브랜드의 방향을 정리하고 고객 경험을 개선하는 프로젝트를 운영합니다.',
    displayOrder: 1,
    headline: '경험이 브랜드의 기준이 되는 곳',
    hiringFocus: '브랜드 전략·UX',
    id: 'sample-dameun-living',
    imageUrl: '/premium-companies/dameun-living.webp',
    industry: '라이프스타일·브랜딩',
    isSample: true,
    location: '서울 성동구',
  },
  {
    companyName: '한결바이오연구소',
    description: '연구 품질과 사업 운영을 함께 고도화할 바이오헬스 전문가를 찾습니다.',
    displayOrder: 2,
    headline: '연구의 깊이를 사업의 성과로 연결합니다',
    hiringFocus: '연구기획·품질관리',
    id: 'sample-hangyeol-bio',
    imageUrl: '/premium-companies/hangyeol-bio.webp',
    industry: '바이오헬스',
    isSample: true,
    location: '경기 성남시',
  },
  {
    companyName: '마루서비스디자인',
    description: '현장의 목소리를 서비스 구조와 실행 가능한 운영 기준으로 바꿉니다.',
    displayOrder: 3,
    headline: '좋은 경험을 오래 가는 서비스로 만듭니다',
    hiringFocus: '서비스 기획·고객경험',
    id: 'sample-maru-service',
    imageUrl: '/premium-companies/maru-service.webp',
    industry: '서비스디자인',
    isSample: true,
    location: '서울 종로구',
  },
  {
    companyName: '바른물류기술',
    description: '데이터와 현장 경험을 바탕으로 물류 운영의 낭비를 줄이는 팀입니다.',
    displayOrder: 4,
    headline: '현장을 이해하는 기술이 운영을 바꿉니다',
    hiringFocus: '물류운영·데이터 분석',
    id: 'sample-bareun-logistics',
    imageUrl: '/premium-companies/bareun-logistics.webp',
    industry: '스마트물류',
    isSample: true,
    location: '경기 이천시',
  },
];
