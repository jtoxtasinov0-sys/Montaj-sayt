/** Klient va server komponentlarda ishlatiladigan URL yordamchisi */
export function uploadUrl(key: string | null | undefined) {
  return key && /^(avatars|covers)\/[a-f0-9-]{36}\.webp$/.test(key) ? `/api/files/${key}` : null;
}
