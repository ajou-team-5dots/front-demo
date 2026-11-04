// Figma 25:190 "기술 기록 없음 (일반 몬스터)", in gray-1 (the design's lighter gray fails contrast).
interface EmptyStateProps {
  children: string;
}

export function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center py-8 text-center text-(length:--font-size-body) font-semibold text-gray-1">
      {children}
    </div>
  );
}
