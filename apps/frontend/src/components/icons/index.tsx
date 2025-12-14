import {
  Home,
  Cloud,
  Shield,
  Settings,
  Menu,
  ChevronRight,
  Search,
  Bell,
  User,
  LogOut,
  Users,
  AlertTriangle,
  Plus,
  TrendingUp,
  TrendingDown,
  Server,
  DollarSign,
  Activity,
  MapPin,
  Package,
  BarChart3,
  PieChart,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

export const Icons = {
  // Navigation
  home: Home,
  cloud: Cloud,
  shield: Shield,
  settings: Settings,
  menu: Menu,
  chevronRight: ChevronRight,

  // Actions
  search: Search,
  bell: Bell,
  user: User,
  logout: LogOut,
  plus: Plus,
  refresh: RefreshCw,

  // Stats & Metrics
  users: Users,
  alertTriangle: AlertTriangle,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  server: Server,
  dollarSign: DollarSign,
  activity: Activity,
  barChart: BarChart3,
  pieChart: PieChart,

  // Resources
  mapPin: MapPin,
  package: Package,

  // Time
  calendar: Calendar,
  clock: Clock,

  // Status
  checkCircle: CheckCircle,
  xCircle: XCircle,
  alertCircle: AlertCircle,
  info: Info,
} as const;

export type IconName = keyof typeof Icons;
