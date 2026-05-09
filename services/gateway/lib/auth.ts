import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthAPI } from "@/lib/api";

type UserRole = "DIRECTEUR" | "ADMIN" | "FINANCIER" | "MEMBRE";

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  role: UserRole;
}

export const authOptions: NextAuthOptions = {
  // Pas de PrismaAdapter — sessions JWT uniquement, persistance déléguée à services/auth
  session: { strategy: "jwt" as const, maxAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const { user, token } = await AuthAPI.login({
            email: credentials.email,
            password: credentials.password,
          });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? null,
            role: user.role as UserRole,
            // On stocke le JWT du service auth pour pouvoir le forwarder ensuite
            authServiceToken: token,
          } as AuthUser & { authServiceToken: string };
        } catch {
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const { user: linked, token } = await AuthAPI.googleUpsert({
            email: user.email,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            providerAccountId: account.providerAccountId as string,
          });
          // Hydrate l'objet user pour que jwt callback voie les bons champs
          (user as unknown as Record<string, unknown>).id = linked.id;
          (user as unknown as Record<string, unknown>).role = linked.role;
          (user as unknown as Record<string, unknown>).authServiceToken = token;
          return true;
        } catch {
          // Service auth a refusé (user inactif ou non inscrit)
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = (user as AuthUser).id;
        token.role = (user as AuthUser).role;
        token.authServiceToken = (user as { authServiceToken?: string }).authServiceToken;
      }
      if (account?.provider === "google") {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).role = token.role;
      }
      (session as Record<string, unknown>).authServiceToken = token.authServiceToken;
      (session as Record<string, unknown>).googleAccessToken = token.googleAccessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const nextAuthHandler = NextAuth(authOptions);
export const { GET: authGET, POST: authPOST } = nextAuthHandler;
export const handlers = { GET: authGET, POST: authPOST };

// Server-side auth helper
export async function auth() {
  const { getServerSession } = await import("next-auth/next");
  return getServerSession(authOptions);
}

export const signIn = () => null;
export const signOut = () => null;
