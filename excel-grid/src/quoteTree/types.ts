export type HierarchyDetailRow = {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
};

export type HierarchyL2Node = {
  id: string;
  koshuName: string;
  seqLabel: string;
  details: HierarchyDetailRow[];
};

export type HierarchyL1Group = {
  id: string;
  label: string;
  children: HierarchyL2Node[];
};

export type QuoteTreeDoc = {
  version: 1;
  roots: HierarchyL1Group[];
};
