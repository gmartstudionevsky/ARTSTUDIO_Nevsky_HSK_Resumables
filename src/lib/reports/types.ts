export type ConsumptionGroupBy = 'expenseArticle' | 'purpose';

export type ConsumptionReportQuery = {
  from: string;
  to: string;
  groupBy?: ConsumptionGroupBy;
  q?: string;
  limitGroups?: number;
};

export type ConsumptionReportRow = {
  item: { id: string; code: string; name: string };
  reportUnit: { id: string; name: string };
  qtyBase: string;
  qtyReport: string;
};

export type ConsumptionReportGroup = {
  key: { id: string; code: string; name: string };
  rows: ConsumptionReportRow[];
};

export type ConsumptionReportResponse = {
  from: string;
  to: string;
  groupBy: ConsumptionGroupBy;
  groups: ConsumptionReportGroup[];
  meta: {
    rowsTotal: number;
    warnings?: string[];
  };
};
