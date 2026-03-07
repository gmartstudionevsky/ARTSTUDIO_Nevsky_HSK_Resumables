export type AccountingPositionId = string;

export interface AccountingPositionDirectoryLink {
  id: string;
  code?: string;
  name: string;
}

export type AccountingAxisMode = 'required' | 'optional' | 'disabled';

export interface ControlledAnalyticParameter {
  key: string;
  value: string;
  source: 'control-plane';
}

export interface AccountingPositionAnalytics {
  /**
   * Базовая бухгалтерско-складская ось.
   *
   * На уровне совместимости R2.2 берётся из legacy-связи `defaultExpenseArticle`.
   * В рабочем пространстве допускается двухуровневое именование, но канонически
   * остаётся строгой бухгалтерской сущностью.
   */
  expenseArticle: {
    id: string;
    code?: string;
    name: string;
    workspaceNaming: {
      level1: string | null;
      level2: string | null;
    };
    source: 'legacy.defaultExpenseArticle';
  };

  /**
   * Базовая рабочая ось (не финансовая аналитика).
   *
   * На уровне совместимости R2.2 маппится из legacy-связи `defaultPurpose`.
   * Это главный операционный контекст сотрудника для работы с позицией.
   */
  section: {
    id: string;
    code?: string;
    name: string;
    source: 'legacy.defaultPurpose';
  };

  /**
   * Extension point управляемых параметров (control-plane слой).
   *
   * На этапе R2.2 структура уже канонизирована, но не навязывает обязательность
   * и не реализует полный жизненный цикл администрирования параметров.
   */
  controlledParameters: {
    mode: AccountingAxisMode;
    values: ControlledAnalyticParameter[];
  };

  /**
   * Контракт доступности аналитических осей для следующего шага R2.3.
   * Позволяет безопасно двигаться к более строгим инвариантам без ложной догмы
   * "все аналитики всегда обязательны".
   */
  availability: {
    expenseArticle: AccountingAxisMode;
    section: AccountingAxisMode;
    controlledParameters: AccountingAxisMode;
  };

  /**
   * Compatibility aliases для безопасного перехода с R2.1.
   */
  compatibility: {
    expenseArticleId: string;
    purposeId: string;
  };
}

/**
 * Каноническая сущность предметного ядра R2.1.
 *
 * В persistence-слое она хранится в модели `Item` (legacy naming),
 * но в domain/application слое используется как «Позиция учёта».
 */
export interface AccountingPosition {
  id: AccountingPositionId;
  code: string;
  name: string;
  isActive: boolean;

  category: AccountingPositionDirectoryLink;
  defaultExpenseArticle: AccountingPositionDirectoryLink;
  defaultPurpose: AccountingPositionDirectoryLink;

  baseUnit: AccountingPositionDirectoryLink;
  defaultInputUnit: AccountingPositionDirectoryLink;
  reportUnit: AccountingPositionDirectoryLink;

  minQtyBase: string | null;
  synonyms: string | null;
  note: string | null;

  analytics: AccountingPositionAnalytics;
}
