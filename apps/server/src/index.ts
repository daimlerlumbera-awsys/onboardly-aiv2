import dotenv from 'dotenv'
import { resolve } from 'path'
// Load .env before any other imports that read env vars
dotenv.config({ path: resolve(import.meta.dirname, '../.env') })

import express from 'express'
import cors from 'cors'
import './auth/passport'
import passport from 'passport'
import authRouter from './routes/auth'
import mockRouter from './routes/mock'
import employeesRouter from './routes/employees'
import requirementsRouter, { requirementsCatalogueRouter } from './routes/requirements'
import tasksRouter from './routes/tasks'
import dashboardRouter from './routes/dashboard'
import { idCardsRouter, employeeIdCardRouter } from './routes/idCards'
import uploadRouter from './routes/upload'
import ocrProfilesRouter, { ocrReviewRouter } from './routes/ocrProfiles'
import documentsRouter from './routes/documents'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true }))
app.use(express.json())
app.use(passport.initialize())

app.use('/uploads', express.static(resolve(process.cwd(), 'uploads')))

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/upload', uploadRouter)
app.use('/api/auth', authRouter)
app.use('/api/employees', employeesRouter)
app.use('/api/employees/:id/requirements', requirementsRouter)
app.use('/api/employees/:id/tasks', tasksRouter)
app.use('/api/employees', employeeIdCardRouter)   // /api/employees/:id/id-card
app.use('/api/tasks', tasksRouter)
app.use('/api/requirements', requirementsRouter)
app.use('/api/requirements-catalogue', requirementsCatalogueRouter)
app.use('/api/employees/:id/ocr-profile', ocrProfilesRouter)
app.use('/api/ocr-profiles', ocrReviewRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/id-cards', idCardsRouter)           // /api/id-cards, /api/id-cards/me, /api/id-cards/:id/revoke
app.use('/api/dashboard', dashboardRouter)
app.use('/api', mockRouter)

app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`)
})

export default app
