import { DashboardLayoutWrapper } from '@/components/layout/DashboardLayoutWrapper';
import { Providers } from '../providers';
import { FeatureFlagsPanel } from '@/components/shared/feature-flags-panel';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
      <FeatureFlagsPanel />
    </Providers>
  );
}
