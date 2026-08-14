export type FitScoreTone = {
  barClassName: string;
  containerClassName: string;
  label: '매우 높음' | '높음' | '보통' | '참고';
  labelClassName: string;
  rangeLabel: '90점 이상' | '80점 이상' | '70점 이상' | '70점 미만';
  scoreClassName: string;
};

export function getFitScoreTone(score: number): FitScoreTone {
  if (score >= 90) {
    return {
      barClassName: 'bg-[#173F3A]',
      containerClassName: 'border-[#173F3A] bg-[#173F3A] text-white',
      label: '매우 높음',
      labelClassName: 'text-white/75',
      rangeLabel: '90점 이상',
      scoreClassName: 'text-[#FFB19F]',
    };
  }

  if (score >= 80) {
    return {
      barClassName: 'bg-[#F06B4F]',
      containerClassName: 'border-[#F06B4F]/55 bg-[#FDF0ED] text-[#7F3427]',
      label: '높음',
      labelClassName: 'text-[#7F3427]/75',
      rangeLabel: '80점 이상',
      scoreClassName: 'text-[#A94230]',
    };
  }

  if (score >= 70) {
    return {
      barClassName: 'bg-[#A9934A]',
      containerClassName: 'border-[#CDBF8C] bg-[#F7F3E7] text-[#5C512D]',
      label: '보통',
      labelClassName: 'text-[#5C512D]/75',
      rangeLabel: '70점 이상',
      scoreClassName: 'text-[#6E5E2F]',
    };
  }

  return {
    barClassName: 'bg-slate-500',
    containerClassName: 'border-slate-300 bg-slate-100 text-slate-700',
    label: '참고',
    labelClassName: 'text-slate-500',
    rangeLabel: '70점 미만',
    scoreClassName: 'text-slate-700',
  };
}
