import { DashboardLayoutWrapper } from '@/components/layout/DashboardLayoutWrapper';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
