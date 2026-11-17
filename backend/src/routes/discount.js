import {pool} from '../db.js';

const defaults = {enabled: false, type: 'flat', value: 1, scope: 'all', productIds: []};
const maxInteger = 2_147_483_647;
const maxSelection = 5_000;

export async function getDiscount(req, res, next) {
  try {
    const {rows} = await pool.query(`
      SELECT enabled, type, value, scope, product_ids AS "productIds"
      FROM catalog_discount WHERE id = 1
    `);
    res.json(rows[0] ?? defaults);
  } catch (error) {
    next(error);
  }
}

export async function updateDiscount(req, res, next) {
  const {enabled, type, value, scope, productIds} = req.body ?? {};
  if (typeof enabled !== 'boolean' || !['flat', 'percent'].includes(type)) {
    return res.status(400).json({error: 'Status atau jenis diskon tidak valid'});
  }
  const maxValue = type === 'percent' ? 100 : maxInteger;
  if (!Number.isInteger(value) || value < 1 || value > maxValue) {
    return res.status(400).json({
      error: type === 'percent' ? 'Persentase diskon harus berupa bilangan bulat 1–100' : 'Harga promo tidak valid',
    });
  }
  if (!['all', 'selected'].includes(scope)) {
    return res.status(400).json({error: 'Cakupan diskon tidak valid'});
  }
  if (!Array.isArray(productIds) || productIds.length > maxSelection ||
      productIds.some(id => !Number.isInteger(id) || id < 1 || id > maxInteger)) {
    return res.status(400).json({error: 'Daftar produk diskon tidak valid'});
  }

  const selectedIds = scope === 'selected' ? [...new Set(productIds)] : [];
  if (enabled && scope === 'selected' && selectedIds.length === 0) {
    return res.status(400).json({error: 'Pilih minimal satu produk untuk diskon'});
  }

  try {
    const {rows} = await pool.query(`
      INSERT INTO catalog_discount (id, enabled, type, value, scope, product_ids)
      VALUES (1, $1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        type = EXCLUDED.type,
        value = EXCLUDED.value,
        scope = EXCLUDED.scope,
        product_ids = EXCLUDED.product_ids
      RETURNING enabled, type, value, scope, product_ids AS "productIds"
    `, [enabled, type, value, scope, selectedIds]);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}
