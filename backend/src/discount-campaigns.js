import {pool} from './db.js';
import {ensureCatalogDiscountTable} from './catalog-discount.js';

export async function ensureDiscountCampaignTables() {
  await ensureCatalogDiscountTable();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS discount_campaigns (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 150),
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ,
      imported_legacy BOOLEAN NOT NULL DEFAULT false,
      CHECK (CASE WHEN ends_at IS NULL THEN imported_legacy ELSE ends_at > starts_at END)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS discount_campaigns_single_legacy
      ON discount_campaigns (imported_legacy) WHERE imported_legacy;
    CREATE TABLE IF NOT EXISTS discount_campaign_products (
      campaign_id INTEGER NOT NULL REFERENCES discount_campaigns(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      original_price INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('flat', 'percent')),
      value INTEGER NOT NULL CHECK (value > 0 AND (type <> 'percent' OR value <= 100)),
      PRIMARY KEY (campaign_id, product_id)
    );
    CREATE INDEX IF NOT EXISTS discount_campaign_products_product_idx
      ON discount_campaign_products (product_id, campaign_id);

    WITH imported AS (
      INSERT INTO discount_campaigns (name, starts_at, imported_legacy)
      SELECT 'Diskon sebelumnya', now(), true FROM catalog_discount WHERE id = 1 AND enabled
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    INSERT INTO discount_campaign_products (campaign_id, product_id, product_name, original_price, type, value)
    SELECT imported.id, p.id, p.name, p.price, legacy.type, legacy.value
    FROM imported CROSS JOIN catalog_discount legacy
    JOIN products p ON legacy.scope = 'all' OR p.id = ANY(legacy.product_ids)
    WHERE legacy.id = 1 AND (legacy.type <> 'flat' OR legacy.value < p.price);
  `);
}
