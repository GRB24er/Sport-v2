import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "./mongodb";
import User from "../models/User";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Login",
      credentials: {
        login: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) {
          throw new Error("Email/phone and password are required");
        }

        const login = credentials.login.trim();

        // Admin login (supports phone or email)
        if (login === process.env.ADMIN_PHONE || login === process.env.ADMIN_EMAIL) {
          // Support both hashed (bcrypt $2a$/$2b$) and plain text admin passwords
          const adminPw = process.env.ADMIN_PASSWORD || "";
          const isHashed = adminPw.startsWith("$2a$") || adminPw.startsWith("$2b$");
          const adminMatch = isHashed
            ? await bcrypt.compare(credentials.password, adminPw)
            : credentials.password === adminPw;

          if (adminMatch) {
            return {
              id: "admin",
              phone: process.env.ADMIN_PHONE || "",
              email: process.env.ADMIN_EMAIL || "",
              name: process.env.ADMIN_NAME || "Admin",
              role: "admin",
            };
          }
        }

        await connectDB();

        // Find user by email or phone
        const isEmail = login.includes("@");
        const query = isEmail ? { email: login.toLowerCase() } : { phone: login };
        const user = await User.findOne(query).select("+password");

        if (!user) throw new Error("Invalid credentials");

        const isMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isMatch) throw new Error("Invalid credentials");

        if (user.status === "pending") throw new Error("Account pending — payment verification in progress.");
        if (user.status === "rejected") throw new Error("Account rejected. Contact our team for assistance.");
        if (user.status === "suspended") throw new Error("Account suspended. Contact our team for assistance.");
        if (user.status === "banned") throw new Error("Account has been permanently banned.");
        if (user.status === "blocked") throw new Error("Account is temporarily blocked. Contact our team for assistance.");

        return {
          id: user._id.toString(),
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: "user",
          referralCode: user.referralCode || null,
          bettingId: user.bettingId,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
        token.role = user.role;
        token.status = user.status;
        token.referralCode = user.referralCode;
        token.bettingId = user.bettingId;
      }
      if (trigger === "update" && session) Object.assign(token, session);
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.phone = token.phone;
      session.user.role = token.role;
      session.user.status = token.status;
      session.user.referralCode = token.referralCode;
      session.user.bettingId = token.bettingId;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
