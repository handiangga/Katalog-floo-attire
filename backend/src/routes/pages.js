import {pool} from '../db.js';

const editablePages = new Set(['about', 'rules']);

export async function getPage(req, res, next) {
  const {page} = req.params;
  if (!editablePages.has(page)) {
    return res.status(404).json({error: 'Halaman tidak ditemukan'});
  }

  try {
    const {rows} = await pool.query('SELECT content FROM site_pages WHERE slug = $1', [page]);
    res.json({content: rows[0]?.content ?? null});
  } catch (error) {
    next(error);
  }
}

export async function updatePage(req, res, next) {
  const {page} = req.params;
  if (!editablePages.has(page)) {
    return res.status(404).json({error: 'Halaman tidak ditemukan'});
  }

  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!content || content.length > 10_000 || content.includes('\0')) {
    return res.status(400).json({error: 'Konten wajib diisi dan maksimal 10.000 karakter'});
  }

  try {
    const {rows} = await pool.query(`
      INSERT INTO site_pages (slug, content) VALUES ($1, $2)
      ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content
      RETURNING content
    `, [page, content]);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}
