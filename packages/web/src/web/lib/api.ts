import { hc } from "hono/client";
import type { AppType } from "../../api";
import { getToken } from "./auth";
import { guestHeaders } from "./guest";

const client = hc<AppType>("/", {
  headers: () => {
    const token = getToken();
    if (token) return { Authorization: `Bearer ${token}` };
    // No real auth session — send guest identity headers
    return guestHeaders();
  },
});

export const api = client.api;
