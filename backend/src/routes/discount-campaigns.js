import {Router} from 'express';
import {pool} from '../db.js';

const router = Router();
const maxInteger = 2_147_483_647;
const maxProducts = 1_000;
const summary = `c.id, c.name, c.starts_at AS "startsAt", c.ends_at AS "endsAt",
  CASE WHEN c.starts_at > now() THEN 'scheduled'
       WHEN c.ends_at <= now() THEN 'ended'
       ELSE 'active' END AS status,
  (SELECT COUNT(*)::integer FROM discount_campaign_products WHERE campaign_id = c.id) AS "productCount"`;

function isPositiveInteger(value, max = maxInteger) {
  return Number.isInteger(value) && value > 0 && value <= max;
}

function readTimestamp(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) {
    return null;
  }
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

router.get('/', async (_req, res, next) => {
  try {
    const {rows} = await pool.query(`SELECT ${summary} FROM discount_campaigns c ORDER BY c.starts_at DESC, c.id DESC`);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/reservations', async (_req, res, next) => {
  try {
    const {rows} = await pool.query(`
      SELECT i.product_id AS "productId", c.id AS "campaignId", c.name AS "campaignName"
      FROM discount_campaign_products i
      JOIN discount_campaigns c ON c.id = i.campaign_id
      WHERE c.ends_at IS NULL OR c.ends_at > statement_timestamp()
      ORDER BY i.product_id, c.id
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!isPositiveInteger(id)) return res.status(404).json({error: 'Campaign tidak ditemukan'});
  try {
    const {rows} = await pool.query(`
      SELECT ${summary},
        COALESCE((
          SELECT json_agg(json_build_object(
            'productId', i.product_id, 'type', i.type, 'value', i.value,
            'name', COALESCE(p.name, i.product_name), 'price', COALESCE(p.price, i.original_price),
            'removed', p.id IS NULL
          ) ORDER BY i.product_id)
          FROM discount_campaign_products i LEFT JOIN products p ON p.id = i.product_id
          WHERE i.campaign_id = c.id
        ), '[]'::json) AS products
      FROM discount_campaigns c WHERE c.id = $1
    `, [id]);
    if (!rows[0]) return res.status(404).json({error: 'Campaign tidak ditemukan'});
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

async function saveCampaign(req, res, next) {
  const id = req.params.id === undefined ? null : Number(req.params.id);
  if (id !== null && !isPositiveInteger(id)) return res.status(404).json({error: 'Campaign tidak ditemukan'});
  const {name, startsAt, endsAt, products} = req.body ?? {};
  const start = readTimestamp(startsAt);
  const end = readTimestamp(endsAt);
  const keepLegacyEnd = id !== null && endsAt === null;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 150) {
    return res.status(400).json({error: 'Isi nama campaign dengan 1–150 karakter'});
  }
  if (!start || (!keepLegacyEnd && (!end || end <= start))) {
    return res.status(400).json({error: 'Waktu selesai harus setelah waktu mulai'});
  }
  if (!Array.isArray(products) || products.length > maxProducts || (id === null && !products.length)) {
    return res.status(400).json({error: id === null
      ? 'Tambahkan 1–1.000 produk ke campaign'
      : 'Campaign dibatasi hingga 1.000 produk'});
  }
  const ids = new Set();
  for (const item of products) {
    if (!item || !isPositiveInteger(item.productId) || ids.has(item.productId) ||
        !['flat', 'percent'].includes(item.type) || !isPositiveInteger(item.value, item.type === 'percent' ? 100 : maxInteger)) {
      return res.status(400).json({error: 'Daftar produk atau nilai diskon tidak valid'});
    }
    ids.add(item.productId);
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    let campaignId = id;
    if (id === null) {
      const {rows} = await client.query(
        'INSERT INTO discount_campaigns (name, starts_at, ends_at) VALUES ($1, $2, $3) RETURNING id',
        [name.trim(), start, end],
      );
      campaignId = rows[0].id;
    } else {
      if (keepLegacyEnd) {
        const {rows} = await client.query(
          'SELECT imported_legacy, ends_at FROM discount_campaigns WHERE id=$1 FOR UPDATE',
          [id],
        );
        if (!rows[0] || !rows[0].imported_legacy || rows[0].ends_at !== null) {
          await client.query('ROLLBACK');
          return res.status(400).json({error: 'Waktu selesai wajib diisi'});
        }
      }
      const {rowCount} = await client.query(
        'UPDATE discount_campaigns SET name=$1, starts_at=$2, ends_at=$3 WHERE id=$4',
        [name.trim(), start, end, id],
      );
      if (!rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({error: 'Campaign tidak ditemukan'});
      }
    }

    // Hold product locks for both admissions and removals until the campaign change commits.
    // A subsequent statement sees the latest reservation after a concurrent save releases its locks.
    const {rows} = await client.query(`
      SELECT id, name, price FROM products
      WHERE id = ANY($1::integer[]) OR id IN (
        SELECT product_id FROM discount_campaign_products WHERE campaign_id = $2
      )
      ORDER BY id FOR NO KEY UPDATE
    `, [[...ids], campaignId]);
    const details = new Map(rows.map(product => [product.id, product]));
    const invalid = products.find(item => {
      const product = details.get(item.productId);
      if (!product) return true;
      return item.type === 'flat' ? item.value >= product.price
        : Math.round(product.price * (100 - item.value) / 100) >= product.price;
    });
    if (invalid) {
      await client.query('ROLLBACK');
      const product = details.get(invalid.productId);
      return res.status(400).json({error: product
        ? 'Harga diskon harus lebih rendah dari harga asli ' + product.name
        : 'Ada produk yang sudah tidak tersedia. Hapus produk tersebut dari campaign.'});
    }
    const {rows: conflicts} = await client.query(`
      SELECT i.product_id, c.name
      FROM discount_campaign_products i
      JOIN discount_campaigns c ON c.id = i.campaign_id
      WHERE i.product_id = ANY($1::integer[]) AND c.id <> $2
        AND (c.ends_at IS NULL OR c.ends_at > statement_timestamp())
        AND ($3::timestamptz IS NULL OR $3 > statement_timestamp() OR NOT EXISTS (
          SELECT 1 FROM discount_campaign_products previous
          WHERE previous.campaign_id = $2 AND previous.product_id = i.product_id
        ))
      ORDER BY i.product_id, c.id
      LIMIT 1
    `, [[...ids], campaignId, end]);
    if (conflicts.length) {
      await client.query('ROLLBACK');
      const conflict = conflicts[0];
      const product = details.get(conflict.product_id);
      return res.status(409).json({
        error: product.name + ' masih terdaftar di campaign ' + conflict.name +
          '. Tunggu sampai campaign selesai atau keluarkan produk dari campaign tersebut.',
      });
    }
    await client.query('DELETE FROM discount_campaign_products WHERE campaign_id = $1', [campaignId]);
    await client.query(`
      INSERT INTO discount_campaign_products (campaign_id, product_id, product_name, original_price, type, value)
      SELECT $1, item.product_id, p.name, p.price, item.type, item.value
      FROM UNNEST($2::integer[], $3::text[], $4::integer[]) AS item(product_id, type, value)
      JOIN products p ON p.id = item.product_id
    `, [campaignId, [...ids], products.map(item => item.type), products.map(item => item.value)]);
    await client.query('COMMIT');
    res.status(id === null ? 201 : 200).json({id: campaignId});
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client?.release();
  }
}

router.post('/', saveCampaign);
router.put('/:id', saveCampaign);

export default router;
