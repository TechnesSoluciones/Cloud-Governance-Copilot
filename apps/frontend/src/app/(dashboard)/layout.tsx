import { DashboardLayoutWrapper } from '@/components/layout/DashboardLayoutWrapper';
import { Providers } from '../providers';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
    </Providers>
  );
}
