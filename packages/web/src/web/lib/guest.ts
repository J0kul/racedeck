/** Persistent guest identity stored in localStorage. */

const ID_KEY = "racedeck_guest_id";
const NAME_KEY = "racedeck_guest_name";

export function getGuestId(): string | null {
  return localStorage.getItem(ID_KEY);
}
export function getGuestName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function setGuest(name: string): { id: string; name: string } {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = `guest_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(ID_KEY, id);
  }
  localStorage.setItem(NAME_KEY, name);
  return { id, name };
}

export function isGuest(): boolean {
  return !!localStorage.getItem(ID_KEY);
}

export function clearGuest() {
  localStorage.removeItem(ID_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function guestHeaders(): Record<string, string> {
  const id = getGuestId();
  const name = getGuestName();
  if (id && name) return { "X-Guest-Id": id, "X-Guest-Name": name };
  return {};
}
