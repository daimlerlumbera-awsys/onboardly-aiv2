import { Router, Request, Response } from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db/index'
import { profiles } from '../db/schema'
import { eq } from 'drizzle-orm'
import { authenticate, AuthUser } from '../middleware/auth'

const router = Router()

const JWT_SECRET  = () => process.env.JWT_SECRET ?? 'dev-secret-change-me'
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'

function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET(),
    { expiresIn: '8h' },
  )
}

// ── Google OAuth ──────────────────────────────────────────────────────────

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
)

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth` }),
  (req: Request, res: Response) => {
    const user  = req.user as AuthUser
    const token = signToken(user)
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`)
  },
)

// ── Email + password login ────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  const { email, password } = parsed.data

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, email))

  if (!profile || !profile.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const valid = await bcrypt.compare(password, profile.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const user: AuthUser = { id: profile.id, email: profile.email, role: profile.role }
  res.json({ token: signToken(user), user })
})

// ── Me ────────────────────────────────────────────────────────────────────

router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user })
})

// ── Logout ────────────────────────────────────────────────────────────────

router.post('/logout', (_req: Request, res: Response) => {
  // Stateless JWT — client discards the token
  res.status(200).json({ message: 'Logged out' })
})

export default router
