import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import type { UserRole } from "@/app/generated/prisma/client";
import type {} from "@/lib/auth-types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // Demander l'acces a Google Drive pour creer des docs
          scope: "openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents",
          access_type: "offline", // Pour obtenir un refresh_token
          prompt: "consent",      // Forcer le consentement pour avoir le refresh_token
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existing = await prisma.user.findUnique({ where: { email: user.email! } });
        if (!existing) return false;
        if (!existing.googleId && account.providerAccountId) {
          await prisma.user.update({ where: { email: user.email! }, data: { googleId: account.providerAccountId } });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
      }
      // Stocker le Google access token dans le JWT
      if (account?.provider === "google") {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;
      }
      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email }, select: { id: true, role: true } });
        if (dbUser) { token.id = dbUser.id; token.role = dbUser.role; }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        // Exposer le token Google dans la session (pour l'API Drive)
        (session as { googleAccessToken?: string }).googleAccessToken = token.googleAccessToken as string | undefined;
      }
      return session;
    },
  },
});
