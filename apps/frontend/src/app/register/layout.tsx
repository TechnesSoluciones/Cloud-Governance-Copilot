import { Providers } from '../providers';

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
