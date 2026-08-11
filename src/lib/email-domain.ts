const DEFAULT_DOMAIN = "@cjmart.co.th";

export function getAllowedEmailDomains(): string[] {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS;
  if (!raw) return [DEFAULT_DOMAIN];
  return raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return getAllowedEmailDomains().some((domain) => lower.endsWith(domain.toLowerCase()));
}
