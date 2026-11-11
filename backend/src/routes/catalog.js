import {Router} from 'express';
import {pool} from '../db.js';
const router=Router();
const select=`SELECT p.*, c.name AS category,
 COALESCE((SELECT json_agg(json_build_object('id',i.id,'url',i.path) ORDER BY i.sort_order,i.id) FROM product_images i WHERE i.product_id=p.id),'[]'::json) AS images
 FROM products p LEFT JOIN categories c ON c.id=p.category_id`;
router.get('/categories',async(req,res,next)=>{try{res.json((await pool.query('SELECT * FROM categories ORDER BY name')).rows);}catch(e){next(e);}});
router.get('/settings',(req,res)=>res.json({whatsapp:process.env.WHATSAPP_NUMBER||''}));
const sortOrders = new Map([
  ['newest', 'p.created_at DESC, p.id DESC'],
  ['oldest', 'p.created_at ASC, p.id ASC'],
  ['price_asc', 'p.price ASC, p.id ASC'],
  ['price_desc', 'p.price DESC, p.id ASC'],
  ['name', 'p.name ASC, p.id ASC'],
]);

function positiveInteger(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

router.get('/products', async (req, res, next) => {
  const {q, category, sort, available, color, size, ids, page, limit} = req.query;
  const paginated = page !== undefined || limit !== undefined;
  const requestedPage = page === undefined ? 1 : positiveInteger(page);
  const requestedLimit = limit === undefined ? 24 : positiveInteger(limit);
  if (paginated && (!requestedPage || !requestedLimit)) {
    return res.status(400).json({error: 'Halaman dan batas produk harus berupa bilangan bulat positif'});
  }
  if ([q, color, size].some(value => value !== undefined && typeof value !== 'string')) {
    return res.status(400).json({error: 'Filter produk tidak valid'});
  }

  const values = [];
  const conditions = [];
  const add = (sql, value) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (q) add('p.name ILIKE ?', `%${q}%`);
  if (category) {
    const categoryId = positiveInteger(category);
    if (!categoryId || categoryId > 2147483647) {
      return res.status(400).json({error: 'Kategori tidak valid'});
    }
    add('p.category_id = ?', categoryId);
  }
  if (available === 'true') conditions.push('p.available = true');
  if (paginated && available === 'false') conditions.push('p.available = false');
  if (color) add('p.color ILIKE ?', `%${color}%`);
  if (size) add('p.sizes ILIKE ?', `%${size}%`);
  if (ids !== undefined) {
    const productIds = typeof ids === 'string' ? ids.split(',').filter(Boolean).map(positiveInteger) : null;
    if (!productIds || productIds.some(id => !id || id > 2147483647)) {
      return res.status(400).json({error: 'Daftar ID produk tidak valid'});
    }
    add('p.id = ANY(?::integer[])', productIds);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = sortOrders.get(sort) ?? sortOrders.get('newest');
  try {
    if (!paginated) {
      const {rows} = await pool.query(`${select} ${where} ORDER BY ${order} LIMIT 200`, values);
      return res.json(rows);
    }

    const pageSize = Math.min(requestedLimit, 100);
    const pageParam = `$${values.length + 1}::bigint`;
    const limitParam = `$${values.length + 2}::integer`;
    // Count and read the requested page in one database snapshot.
    const {rows} = await pool.query(`
      WITH totals AS (
        SELECT count(*) AS total FROM products p ${where}
      ), pagination AS (
        SELECT total, GREATEST(1, LEAST(${pageParam}, CEIL(total::numeric / ${limitParam})::bigint)) AS page
        FROM totals
      )
      SELECT pagination.total, pagination.page, p.*
      FROM pagination
      LEFT JOIN LATERAL (
        ${select} ${where}
        ORDER BY ${order}
        LIMIT ${limitParam} OFFSET ((pagination.page - 1) * ${limitParam})
      ) p ON true
      ORDER BY ${order}
    `, [...values, requestedPage, pageSize]);
    const total = Number(rows[0].total);
    const items = total ? rows.map(({total, page, ...product}) => product) : [];
    res.json({items, total, page: Number(rows[0].page), limit: pageSize});
  } catch (error) {
    next(error);
  }
});
router.get('/products/:slug',async(req,res,next)=>{
 try{const {rows}=await pool.query(`${select} WHERE p.slug=$1`,[req.params.slug]);if(!rows[0])return res.status(404).json({error:'Produk tidak ditemukan'});res.json(rows[0]);}catch(e){next(e);}
});
export default router;
