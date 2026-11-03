import {Router} from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {pool} from '../db.js';
import {requireAdmin} from '../middleware/auth.js';
const router=Router();router.use(requireAdmin);
const dir=path.resolve(process.env.UPLOAD_DIR||'./uploads');fs.mkdirSync(dir,{recursive:true});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},fileFilter:(_,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
function valid(b){return typeof b.name==='string'&&!!b.name.trim()&&Number.isSafeInteger(Number(b.price))&&Number(b.price)>=0;}
function slug(name){return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'produk';}
router.post('/categories',async(req,res,next)=>{try{if(typeof req.body.name!=='string'||!req.body.name.trim())return res.status(400).json({error:'Nama kategori wajib'});res.json((await pool.query('INSERT INTO categories(name) VALUES($1) RETURNING *',[req.body.name.trim()])).rows[0]);}catch(e){next(e);}});
router.post('/products',async(req,res,next)=>{try{
 if(!valid(req.body))return res.status(400).json({error:'Nama dan harga tidak valid'});
 const b=req.body;const unique=slug(b.name)+'-'+crypto.randomBytes(3).toString('hex');
 const {rows}=await pool.query(`INSERT INTO products(name,slug,category_id,price,color,sizes,description,available) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
 [b.name.trim(),unique,b.category_id||null,Number(b.price),b.color||'',b.sizes||'',b.description||'',b.available!==false]);
 res.status(201).json(rows[0]);
}catch(e){next(e);}});
router.put('/products/:id',async(req,res,next)=>{try{
 if(!valid(req.body))return res.status(400).json({error:'Nama dan harga tidak valid'});
 const b=req.body;const {rows}=await pool.query(`UPDATE products SET name=$1,category_id=$2,price=$3,color=$4,sizes=$5,description=$6,available=COALESCE($7, available) WHERE id=$8 RETURNING *`,
 [b.name.trim(),b.category_id||null,Number(b.price),b.color||'',b.sizes||'',b.description||'',b.available === undefined ? null : b.available !== false,req.params.id]);
 if(!rows[0])return res.status(404).json({error:'Produk tidak ditemukan'});res.json(rows[0]);
}catch(e){next(e);}});
router.delete('/products/:id',async(req,res,next)=>{try{
 const {rows}=await pool.query('DELETE FROM products WHERE id=$1 RETURNING id',[req.params.id]);
 if(!rows[0])return res.status(404).json({error:'Produk tidak ditemukan'});
 res.json({ok:true});
}catch(e){next(e);}});
router.post('/products/:id/images',upload.single('image'),async(req,res,next)=>{try{
 if(!req.file)return res.status(400).json({error:'Pilih foto JPG, PNG, atau WebP'});
 const found=await pool.query('SELECT id FROM products WHERE id=$1',[req.params.id]);
 if(!found.rowCount)return res.status(404).json({error:'Produk tidak ditemukan'});
 const name=crypto.randomUUID()+'.webp';const file=path.join(dir,name);
 await sharp(req.file.buffer,{limitInputPixels:30000000}).rotate().resize({width:1200,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:78,effort:4}).toFile(file);
 const url='/uploads/'+name;
 try{
  const old=await pool.query('SELECT path FROM product_images WHERE product_id=$1',[req.params.id]);
  await pool.query('DELETE FROM product_images WHERE product_id=$1',[req.params.id]);
  const {rows}=await pool.query('INSERT INTO product_images(product_id,path) VALUES($1,$2) RETURNING *',[req.params.id,url]);
  for(const item of old.rows)fs.promises.unlink(path.join(dir,path.basename(item.path))).catch(()=>{});
  res.json(rows[0]);
 }catch(e){await fs.promises.unlink(file).catch(()=>{});throw e;}
}catch(e){next(e);}});
router.delete('/images/:id',async(req,res,next)=>{try{
 const {rows}=await pool.query('DELETE FROM product_images WHERE id=$1 RETURNING path',[req.params.id]);
 if(!rows[0])return res.status(404).json({error:'Foto tidak ditemukan'});
 fs.promises.unlink(path.join(dir,path.basename(rows[0].path))).catch(()=>{});
 res.json({ok:true});
}catch(e){next(e);}});
export default router;
