import { RoleLensProvider } from '@/components/topics/role-lens';

export default function TopicsLayout({ children }: LayoutProps<'/topics'>) {
  return <RoleLensProvider>{children}</RoleLensProvider>;
}
