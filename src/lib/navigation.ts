import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  FileType2,
  History,
  PackageSearch,
  Send,
  Shield,
  Settings,
  User,
  Users,
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

export const mainNavItems: NavItem[] = [
  { href: '/stock', label: { key: 'nav.stock', fallback: 'Склад' }, icon: Boxes },
  { href: '/operation', label: { key: 'nav.operation', fallback: 'Операция' }, icon: Wrench },
  { href: '/inventory', label: { key: 'nav.inventory', fallback: 'Инвентаризация' }, icon: ClipboardCheck },
  { href: '/history', label: { key: 'nav.history', fallback: 'История' }, icon: History },
  { href: '/profile', label: { key: 'nav.profile', fallback: 'Профиль' }, icon: User },
];

export const desktopNavItems: NavItem[] = [
  { href: '/stock', label: { key: 'nav.stock', fallback: 'Склад' }, icon: Boxes },
  { href: '/catalog', label: { key: 'nav.catalog', fallback: 'Номенклатура' }, icon: PackageSearch },
  { href: '/operation', label: { key: 'nav.operation', fallback: 'Операция' }, icon: Wrench },
  { href: '/inventory', label: { key: 'nav.inventory', fallback: 'Инвентаризация' }, icon: ClipboardCheck },
  { href: '/history', label: { key: 'nav.history', fallback: 'История' }, icon: History },
  { href: '/reports/consumption', label: { key: 'nav.reports', fallback: 'Отчёты' }, icon: BarChart3 },
  { href: '/profile', label: { key: 'nav.profile', fallback: 'Профиль' }, icon: User },
];

export const adminNavItems: NavItem[] = [
  { href: '/admin', label: { key: 'nav.admin.panel', fallback: 'Админ-панель' }, icon: Shield },
  { href: '/admin/dictionaries', label: { key: 'nav.admin.dictionaries', fallback: 'Справочники' }, icon: Settings },
  { href: '/admin/users', label: { key: 'nav.admin.users', fallback: 'Пользователи' }, icon: Users },
  { href: '/admin/integrations/telegram', label: { key: 'nav.admin.telegram', fallback: 'Telegram' }, icon: Send },
  { href: '/admin/ui-texts', label: { key: 'nav.admin.uiTexts', fallback: 'Тексты интерфейса' }, icon: FileType2 },
];
