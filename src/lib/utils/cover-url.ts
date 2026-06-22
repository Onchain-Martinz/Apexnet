export function coverUrl(id: string, key: string | null): string | null {
  if (!key) return null;
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (base) return `${base.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
  return `/api/books/${id}/cover`;
}
