import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { authenticate } from '../middleware/auth'

const router = Router()

const storage = multer.diskStorage({
  destination: path.resolve(import.meta.dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf/i
    cb(null, allowed.test(path.extname(file.originalname)) || allowed.test(file.mimetype))
  },
})

// POST /api/upload — returns { fileUrl }
router.post('/', authenticate, upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded or unsupported type.' })
    return
  }
  const origin  = `${req.protocol}://${req.get('host')}`
  const fileUrl = `${origin}/uploads/${req.file.filename}`
  res.status(201).json({ fileUrl })
})

export default router
