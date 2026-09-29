const TOKEN_KEY = "entesharino_access_token";

type JwtPayload = {
  role?: string | string[];
  permission?: string | string[];
  [key: string]: unknown;
};

function decodePayload(): JwtPayload | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "="))
        .split("")
        .map((char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function asArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export const auth = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },

  hasPermission(permission: string): boolean {
    const payload = decodePayload();
    if (!payload) return false;

    if (asArray(payload.role).includes("Admin")) return true;

    return asArray(payload.permission).includes(permission);
  },

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((permission) => auth.hasPermission(permission));
  },

  getPermissions(): string[] {
    const payload = decodePayload();
    return asArray(payload?.permission);
  },
};
