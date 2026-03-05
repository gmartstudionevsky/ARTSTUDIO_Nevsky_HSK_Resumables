'use client';

import { useUiTextsContext } from '@/components/ui-texts/UiTextProvider';
import { useIsMobile } from '@/components/ui-texts/useIsMobile';

export function useUiText(key: string, fallback: string): string {
  const { texts } = useUiTextsContext();
  const isMobile = useIsMobile();

  const text = texts[key];
  if (!text) return fallback;

  if (isMobile) {
    return text.mobile ?? text.both ?? fallback;
  }

  return text.web ?? text.both ?? fallback;
}
