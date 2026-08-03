/**
 * Stub tipe minimal Dexie — HANYA untuk offline type-check
 * (scripts/tsconfig.offline.json) di lingkungan tanpa node_modules.
 * Type-check sesungguhnya memakai tipe resmi dexie setelah `npm install`.
 */
declare module 'dexie' {
  export interface WhereClause<T, TKey> {
    equals(value: string | number): Collection<T, TKey>;
    anyOf(values: (string | number)[]): Collection<T, TKey>;
  }
  export interface Collection<T, TKey> {
    toArray(): Promise<T[]>;
    delete(): Promise<number>;
    sortBy(key: string): Promise<T[]>;
  }
  export interface Table<T = unknown, TKey = unknown> {
    put(item: T, key?: TKey): Promise<TKey>;
    add(item: T, key?: TKey): Promise<TKey>;
    bulkAdd(items: T[]): Promise<TKey>;
    update(key: TKey, changes: Record<string, unknown>): Promise<number>;
    get(key: TKey): Promise<T | undefined>;
    where(index: string): WhereClause<T, TKey>;
  }
  export interface Version {
    stores(schema: Record<string, string>): Version;
  }
  export default class Dexie {
    constructor(name: string);
    version(versionNumber: number): Version;
    table(name: string): Table;
    open(): Promise<Dexie>;
    transaction(
      mode: 'r' | 'rw',
      tables: Table<never, never>[] | unknown[],
      scope: () => Promise<void>,
    ): Promise<void>;
  }
}
