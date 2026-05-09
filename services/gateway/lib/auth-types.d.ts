type UserRole = "DIRECTEUR" | "ADMIN" | "FINANCIER" | "MEMBRE";

declare module "next-auth" {
  interface User { role?: UserRole; authServiceToken?: string; }
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null; role: UserRole };
    authServiceToken?: string;
    googleAccessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    authServiceToken?: string;
    googleAccessToken?: string;
    googleRefreshToken?: string;
  }
}
