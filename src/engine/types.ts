export interface FSNodeAttrs {
  readonly?: boolean;
  hidden?: boolean;
  system?: boolean;
  archive?: boolean;
  encrypted?: boolean;
  [key: string]: boolean | string | number | undefined;
}

export interface FSFileNode {
  type: 'file';
  content: string;
  attrs: FSNodeAttrs;
  createdAt?: number;
  modifiedAt?: number;
}

export interface FSDirNode {
  type: 'dir';
  children: Record<string, FSNode>;
  attrs: FSNodeAttrs;
  createdAt?: number;
  modifiedAt?: number;
}

export type FSNode = FSFileNode | FSDirNode;

export type DriveMap = Record<string, FSDirNode>;

export interface ResolveResult {
  path: string;
  drive: string;
  segments: string[];
}

export interface NodeLookupResult {
  node: FSNode;
  canonicalPath: string;
  canonicalName: string;
}
