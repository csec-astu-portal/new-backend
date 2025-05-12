import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            password: true,
            role: true,
            status: true,
            freeName: true,
            divisionId: true,
            isEmailVerified: true
          }
        });

        // If user not found
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check if user is active
        if (user.status !== 'ACTIVE') {
          return done(null, false, { message: 'Your account is not active' });
        }

        // Auto-verify PRESIDENT accounts
        if (!user.isEmailVerified && user.role === 'PRESIDENT') {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { isEmailVerified: true }
            });
            user.isEmailVerified = true;
          } catch (error) {
            // Continue anyway for presidents
          }
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Return user if everything is valid
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        freeName: true,
        divisionId: true
      }
    });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport; 