import {Router} from 'express';
import {pool} from '../db.js';
const router=Router();
const select=`SELECT p.*, c.name AS category,
 COALESCE((SELECT json_agg(json_build_object('id',i.id,'url',i.path) ORDER BY i.sort_order,i.id) FROM product_images i WHERE i.product_id=p.id),'[]'::json) AS images
 FROM products p LEFT JOIN categories c ON c.id=p.category_id`;
router.get('/categories',async(req,res,next)=>{try{res.json((await pool.query('SELECT * FROM categories ORDER BY name')).rows);}catch(e){next(e);}});
router.get('/settings',(req,res)=>res.json({whatsapp:process.env.WHATSAPP_NUMBER||''}));
router.get('/products',async(req,res,next)=>{
 try{
  const {q='',category='',sort='newest',available='',color='',size=''}=req.query;
  const values=[];const where=[];
  const add=(sql,val)=>{values.push(val);where.push(sql.replace('?',`$${values.length}`));};
  if(q) add('p.name ILIKE ?',`%${q}%`);
  if(category) add('p.category_id = ?',Number(category));
  if(available==='true') where.push('p.available=true');
  if(color) add('p.color ILIKE ?',`%${color}%`);
  if(size) add('p.sizes ILIKE ?',`%${size}%`);
  const order={newest:'p.created_at DESC',oldest:'p.created_at ASC',price_asc:'p.price ASC',price_desc:'p.price DESC',name:'p.name ASC'}[sort]||'p.created_at DESC';
  const sql=`${select} ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY ${order} LIMIT 200`;
  res.json((await pool.query(sql,values)).rows);
 }catch(e){next(e);}
});
router.get('/products/:slug',async(req,res,next)=>{
 try{const {rows}=await pool.query(`${select} WHERE p.slug=$1`,[req.params.slug]);if(!rows[0])return res.status(404).json({error:'Produk tidak ditemukan'});res.json(rows[0]);}catch(e){next(e);}
});
export default router;
