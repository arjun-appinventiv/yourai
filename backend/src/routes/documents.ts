// Document routes — /api/documents
// Upload, list, get documents

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { saveFile } from '../lib/storage';
import { ingestDocument } from '../lib/rag';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|xlsx|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, XLSX, and TXT files are allowed'));
    }
  },
});

// GET /api/documents
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const docs = await prisma.document.findMany({
    where: { orgId: req.user!.orgId },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(docs);
});

// POST /api/documents/upload
router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ detail: 'No file provided' });
  }

  const { url, size } = await saveFile(req.user!.orgId, req.file.originalname, req.file.buffer);

  const doc = await prisma.document.create({
    data: {
      orgId: req.user!.orgId,
      name: req.file.originalname,
      size,
      type: req.file.mimetype,
      url,
      status: 'PROCESSING',
      isGlobal: req.body.isGlobal === 'true',
    },
  });

  // Trigger async ingestion (non-blocking)
  ingestDocument(doc.id).catch(err => {
    console.error(`Ingestion failed for doc ${doc.id}:`, err);
  });

  return res.json(doc);
});

// GET /api/documents/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const doc = await prisma.document.findFirst({
    where: { id: req.params.id, orgId: req.user!.orgId },
    include: { chunks: { select: { id: true, pageNumber: true } } },
  });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  return res.json(doc);
});

// DELETE /api/documents/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const doc = await prisma.document.findFirst({
    where: { id: req.params.id, orgId: req.user!.orgId },
  });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  await prisma.chunk.deleteMany({ where: { documentId: doc.id } });
  await prisma.document.delete({ where: { id: doc.id } });

  return res.json({ success: true });
});

export default router;
