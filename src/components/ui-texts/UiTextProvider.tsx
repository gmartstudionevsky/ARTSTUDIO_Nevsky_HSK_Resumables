'use client';

import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchUiTexts } from '@/lib/ui-texts/api';
import { UiTextsMap } from '@/lib/ui-texts/types';

type UiTextContextValue = {
  texts: UiTextsMap;
  refresh: () => Promise<void>;
};

const UiTextContext = createContext<UiTextContextValue>({
  texts: {},
  refresh: async () => {},
});

function toMap(items: Array<{ key: string; ruText: string; scope: 'BOTH' | 'WEB' | 'MOBILE' }>): UiTextsMap {
  return items.reduce<UiTextsMap>((acc, item) => {
    const existing = acc[item.key] ?? {};
    if (item.scope === 'BOTH') existing.both = item.ruText;
    if (item.scope === 'WEB') existing.web = item.ruText;
    if (item.scope === 'MOBILE') existing.mobile = item.ruText;
    acc[item.key] = existing;
    return acc;
  }, {});
}

export function UiTextProvider({ children }: PropsWithChildren): JSX.Element {
  const [texts, setTexts] = useState<UiTextsMap>({});

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const response = await fetchUiTexts({ limit: 500, offset: 0 });
      setTexts(toMap(response.items));
    } catch {
      setTexts({});
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ texts, refresh }), [texts, refresh]);

  return <UiTextContext.Provider value={value}>{children}</UiTextContext.Provider>;
}

export function useUiTextsContext(): UiTextContextValue {
  return useContext(UiTextContext);
}
