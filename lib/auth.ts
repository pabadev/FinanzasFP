import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (!secret || secret === "change-me") {
  throw new Error(
    "AUTH_SECRET no está configurada correctamente. Genera una con: npx auth secret",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const { email, password } = (credentials ?? {}) as {
          email?: string;
          password?: string;
        };
        if (!email || !password) return null;

        const ip =
          request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";

        const allowed = await rateLimit(
          `login:${email.toLowerCase()}:${ip}`,
          10,
          15 * 60_000,
        );
        if (!allowed) return null;

        await connectDB();

        const user = await User.findOne({
          email: email.toLowerCase(),
        }).select("+passwordHash");
        if (!user) return null;

        const valid = await bcrypt.compare(
          password,
          user.passwordHash || "",
        );
        if (!valid) return null;

        const role =
          user.entities && user.entities.length > 0
            ? user.entities[0].role
            : "owner";

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role ?? "owner";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) || "";
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
});
