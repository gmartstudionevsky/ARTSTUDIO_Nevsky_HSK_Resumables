export type WriteFlowFailureKind = 'validation' | 'invariant' | 'not_found' | 'conflict' | 'unexpected';

export interface WriteFlowContext {
  actorId?: string;
  actorRole?: string;
  correlationId?: string;
  entryPoint?: 'ui' | 'api' | 'import' | 'admin' | 'system';
}

export interface WriteFlowMeta {
  scenario: string;
  context?: WriteFlowContext;
}

export interface WriteFlowSuccess<TData> extends WriteFlowMeta {
  ok: true;
  data: TData;
}

export interface WriteFlowFailure extends WriteFlowMeta {
  ok: false;
  kind: WriteFlowFailureKind;
  message: string;
  details?: Record<string, unknown>;
}

export type WriteFlowResult<TData> = WriteFlowSuccess<TData> | WriteFlowFailure;
