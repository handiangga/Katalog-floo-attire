import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {pool} from '../db.js';
const router=Router();
router.post('/login',async(req,res,next)=>{
 try{
  const {email,password}=req.body;
  if(typeof email!=='string'||typeof password!=='string') return res.status(400).json({error:'Email dan password wajib diisi'});
  const {rows}=await pool.query('SELECT * FROM admins WHERE email=$1',[email]);
  if(!rows[0]||!await bcrypt.compare(password,rows[0].password_hash)) return res.status(401).json({error:'Email atau password salah'});
  res.json({token:jwt.sign({id:rows[0].id,email},process.env.JWT_SECRET,{expiresIn:'8h'})});
 }catch(e){next(e);}
});
export default router;
