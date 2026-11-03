import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import auth from './routes/auth.js';
import catalog from './routes/catalog.js';
import admin from './routes/admin.js';
import {getPage, updatePage} from './routes/pages.js';
import {requireAdmin} from './middleware/auth.js';
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.startsWith('CHANGE_')){console.error('JWT_SECRET wajib diset dengan nilai aman');process.exit(1);}
const app=express();app.disable('x-powered-by');
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(cors({origin:process.env.CORS_ORIGIN?.split(',')||'http://localhost:5173'}));
app.use(express.json({limit:'100kb'}));
app.use('/uploads',express.static(path.resolve(process.env.UPLOAD_DIR||'./uploads'),{dotfiles:'deny'}));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:15,standardHeaders:'draft-7',legacyHeaders:false}),auth);
app.get('/api/pages/:page', getPage);
app.put('/api/admin/pages/:page', requireAdmin, updatePage);
app.use('/api',catalog);app.use('/api/admin',admin);
app.use((err,req,res,next)=>{console.error(err);res.status(err.code?.startsWith?.('LIMIT_')?400:500).json({error:'Terjadi kesalahan server'});});

app.listen(Number(process.env.PORT||4000),'127.0.0.1',()=>console.log('API berjalan di port '+(process.env.PORT||4000)));
