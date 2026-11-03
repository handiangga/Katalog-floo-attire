import {pool} from './db.js';

export function ensureSitePagesTable() {
  return pool.query(`
    CREATE TABLE IF NOT EXISTS site_pages (
      slug TEXT PRIMARY KEY CHECK (slug IN ('about', 'rules')),
      content TEXT NOT NULL
    )
  `);
}
