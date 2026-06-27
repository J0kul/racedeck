import type { auth } from "./auth";

type Session = typeof auth.$Infer.Session;

declare module "hono" {
  interface ContextVariableMap {
    user: Session["user"] | null;
    session: Session["session"] | null;
  }
}
