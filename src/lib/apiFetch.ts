export async function apiFetch(
  idToken: string | null,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (idToken) headers.set("Authorization", `Bearer ${idToken}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...options, headers });
}
