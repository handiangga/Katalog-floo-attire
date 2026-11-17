import {pool} from './db.js';

export function ensureCatalogDiscountTable() {
  return pool.query(`
    CREATE TABLE IF NOT EXISTS catalog_discount (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled BOOLEAN NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('flat', 'percent')),
      value INTEGER NOT NULL CHECK (value > 0 AND (type <> 'percent' OR value <= 100)),
      scope TEXT NOT NULL CHECK (scope IN ('all', 'selected')),
      product_ids INTEGER[] NOT NULL DEFAULT '{}'
    )
  `);
}
