import { createMiddleware } from "hono/factory";
import { auth } from "../auth";

export const authMiddleware = createMiddleware(async (c, next) => {
  // First try real better-auth session
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session?.user) {
    c.set("user", session.user);
    c.set("session", session.session);
    return next();
  }

  // Fall back to guest identity (X-Guest-Id + X-Guest-Name headers)
  const guestId = c.req.header("X-Guest-Id");
  const guestName = c.req.header("X-Guest-Name");
  if (guestId && guestName) {
    c.set("user", { id: guestId, name: guestName, email: `${guestId}@guest.racedeck` });
    c.set("session", null);
    return next();
  }

  c.set("user", null);
  c.set("session", null);
  return next();
});

export const requireAuth = createMiddleware(async (c, next) => {
  if (!c.get("user")) return c.json({ message: "Unauthorized" }, 401);
  return next();
});
