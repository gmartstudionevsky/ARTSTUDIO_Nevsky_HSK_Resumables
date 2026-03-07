import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  FileType2,
  History,
  MoreHorizontal,
  PackageSearch,
  Send,
  Shield,
  Settings,
  User,
  Users,
  Upload,
  Wrench,
} from 'lucide-react';

export type NavLabel = {
  key: string;
  fallback: string;
};

export type NavItem = {
  href: string;
  label: NavLabel;
  icon: LucideIcon;
};

export type UserRole = 'SUPERVISOR' | 'MANAGER' | 'ADMIN';

export const mainNavItems: NavItem[] = [
  { href: '/stock', label: { key: 'nav.stock', fallback: 'Склад' }, icon: Boxes },
  { href: '/movements', label: { key: 'nav.movements', fallback: 'Движения' }, icon: Wrench },
  { href: '/inventory', label: { key: 'nav.inventory', fallback: 'Инвентаризация' }, icon: ClipboardCheck },
  { href: '/history', label: { key: 'nav.history', fallback: 'История' }, icon: History },
  { href: '/profile', label: { key: 'nav.profile', fallback: 'Профиль' }, icon: User },
];

export const mobileMoreItem: NavItem = {
  href: '#more',
  label: { key: 'nav.more', fallback: 'Ещё' },
  icon: MoreHorizontal,
};

export function getMobileNavItems(role?: UserRole): NavItem[] {
  const base: NavItem[] = [
    { href: '/stock', label: { key: 'nav.stock', fallback: 'Склад' }, icon: Boxes },
    { href: '/movements', label: { key: 'nav.movements', fallback: 'Движения' }, icon: Wrench },
    { href: '/inventory', label: { key: 'nav.inventory', fallback: 'Инвентаризация' }, icon: ClipboardCheck },
    { href: '/history', label: { key: 'nav.history', fallback: 'История' }, icon: History },
    { href: '/profile', label: { key: 'nav.profile', fallback: 'Профиль' }, icon: User },
  ];

  if (role === 'MANAGER' || role === 'ADMIN') {
    base.push({ href: '/catalog', label: { key: 'nav.catalog', fallback: 'Каталог позиций' }, icon: PackageSearch });
    base.push({ href: '/reports/consumption', label: { key: 'nav.reports', fallback: 'Отчёты' }, icon: BarChart3 });
  }

  if (role === 'ADMIN') {
    base.push({ href: '/admin', label: { key: 'nav.admin.panel', fallback: 'Админка' }, icon: Shield });
    base.push({ href: '/admin/users', label: { key: 'nav.admin.users', fallback: 'Пользователи' }, icon: Users });
  }

  return base;
}

export const desktopNavItems: NavItem[] = [
  { href: '/stock', label: { key: 'nav.stock', fallback: 'Склад' }, icon: Boxes },
  { href: '/catalog', label: { key: 'nav.catalog', fallback: 'Каталог позиций' }, icon: PackageSearch },
  { href: '/movements', label: { key: 'nav.movements', fallback: 'Движения' }, icon: Wrench },
  { href: '/inventory', label: { key: 'nav.inventory', fallback: 'Инвентаризация' }, icon: ClipboardCheck },
  { href: '/history', label: { key: 'nav.history', fallback: 'История' }, icon: History },
  { href: '/reports/consumption', label: { key: 'nav.reports', fallback: 'Отчёты' }, icon: BarChart3 },
  { href: '/profile', label: { key: 'nav.profile', fallback: 'Профиль' }, icon: User },
];

export const adminNavItems: NavItem[] = [
  { href: '/admin', label: { key: 'nav.admin.panel', fallback: 'Админ-панель' }, icon: Shield },
  { href: '/admin/dictionaries', label: { key: 'nav.admin.dictionaries', fallback: 'Справочники' }, icon: Settings },
  { href: '/admin/users', label: { key: 'nav.admin.users', fallback: 'Пользователи' }, icon: Users },
  { href: '/admin/import', label: { key: 'nav.admin.import', fallback: 'Импорт' }, icon: Upload },
  { href: '/admin/settings', label: { key: 'nav.admin.settings', fallback: 'Политики данных' }, icon: Settings },
  { href: '/admin/period-locks', label: { key: 'nav.admin.periodLocks', fallback: 'Закрытие периода' }, icon: Shield },
  { href: '/admin/integrations/telegram', label: { key: 'nav.admin.telegram', fallback: 'Telegram' }, icon: Send },
  { href: '/admin/ui-texts', label: { key: 'nav.admin.uiTexts', fallback: 'Тексты интерфейса' }, icon: FileType2 },
];
