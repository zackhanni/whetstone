export type User = { id: number; name: string };

/**
 * Provided — do not edit. In tests this is replaced by a mock, so your component must
 * pass the AbortSignal through for cancellation to work.
 */
export async function searchUsers(query: string, signal?: AbortSignal): Promise<User[]> {
  const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return (await res.json()) as User[];
}
