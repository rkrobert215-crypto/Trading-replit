import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authMiddleware } from "../lib/jwt";

const router: IRouter = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase(),
        name,
        password_hash,
      })
      .returning();

    const token = signToken({ userId: user.id, email: user.email });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: "This account uses Google sign-in. Please use Google to log in." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential token is required" });
    }

    const payload = await verifyGoogleToken(credential);
    if (!payload) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const { sub: google_id, email, name, picture: avatar_url } = payload;

    let [user] = await db.select().from(usersTable).where(eq(usersTable.google_id, google_id));

    if (!user) {
      [user] = await db.select().from(usersTable).where(eq(usersTable.email, email!.toLowerCase()));

      if (user) {
        [user] = await db
          .update(usersTable)
          .set({ google_id, avatar_url, updated_at: new Date() })
          .where(eq(usersTable.id, user.id))
          .returning();
      } else {
        [user] = await db
          .insert(usersTable)
          .values({
            email: email!.toLowerCase(),
            name: name || email!,
            google_id,
            avatar_url,
          })
          .returning();
      }
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    });
  } catch (err) {
    res.status(500).json({ error: "Google authentication failed" });
  }
});

async function verifyGoogleToken(credential: string): Promise<{ sub: string; email?: string; name?: string; picture?: string } | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.sub || !data.email) return null;
    return data;
  } catch {
    return null;
  }
}

router.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

export default router;
