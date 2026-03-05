import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  History,
  PackageSearch,
  Send,
  Shield,
  Settings,
  User,
  Users,
  Wrench,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const mainNavItems: NavItem[] = [
  { href: '/stock', label: 'Склад', icon: Boxes },
  { href: '/operation', label: 'Операция', icon: Wrench },
  { href: '/inventory', label: 'Инвентаризация', icon: ClipboardCheck },
  { href: '/history', label: 'История', icon: History },
  { href: '/profile', label: 'Профиль', icon: User },
];

export const desktopNavItems: NavItem[] = [
  { href: '/stock', label: 'Склад', icon: Boxes },
  { href: '/catalog', label: 'Номенклатура', icon: PackageSearch },
  { href: '/operation', label: 'Операция', icon: Wrench },
  { href: '/inventory', label: 'Инвентаризация', icon: ClipboardCheck },
  { href: '/history', label: 'История', icon: History },
  { href: '/reports/consumption', label: 'Отчёты', icon: BarChart3 },
  { href: '/profile', label: 'Профиль', icon: User },
];

export const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Админ-панель', icon: Shield },
  { href: '/admin/dictionaries', label: 'Справочники', icon: Settings },
  { href: '/admin/users', label: 'Пользователи', icon: Users },
  { href: '/admin/integrations/telegram', label: 'Telegram', icon: Send },
];
