import { HypothesisLensProvider } from '@/components/topics/hypothesis-lens';
import { RoleLensProvider } from '@/components/topics/role-lens';

export default function TopicsLayout({ children }: LayoutProps<'/topics'>) {
  return (
    <RoleLensProvider>
      <HypothesisLensProvider>{children}</HypothesisLensProvider>
    </RoleLensProvider>
  );
}
