import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { db } from '../db/index'
import { profiles, googleProfiles } from '../db/schema'
import { eq } from 'drizzle-orm'

const googleClientId     = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     googleClientId,
        clientSecret: googleClientSecret,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, googleUser, done) => {
        try {
          const email     = googleUser.emails?.[0]?.value ?? ''
          const firstName = googleUser.name?.givenName    ?? ''
          const lastName  = googleUser.name?.familyName   ?? ''
          const avatarUrl = googleUser.photos?.[0]?.value ?? null

          // Upsert profile (auth user)
          let [profile] = await db
            .select()
            .from(profiles)
            .where(eq(profiles.email, email))

          if (!profile) {
            ;[profile] = await db
              .insert(profiles)
              .values({ email, role: 'employee' })
              .returning()
          }

          // Upsert google_profile
          let [gProfile] = await db
            .select()
            .from(googleProfiles)
            .where(eq(googleProfiles.email, email))

          if (!gProfile) {
            ;[gProfile] = await db
              .insert(googleProfiles)
              .values({ email, firstName, lastName, avatarUrl, role: profile.role, authUserId: profile.id })
              .returning()
          }

          return done(null, { id: profile.id, email: profile.email, role: profile.role })
        } catch (err) {
          return done(err as Error)
        }
      },
    ),
  )
} else {
  console.warn('[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth disabled')
}

export default passport
