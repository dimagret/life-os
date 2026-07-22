export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const isPublicKey = key?.startsWith('sb_publishable_') || key?.startsWith('eyJ');

  return Boolean(
    url &&
    key &&
    !url.includes('your-project') &&
    isPublicKey
  );
}

export function getSupabasePublicConfig() {
  if (!isSupabaseConfigured()) return null;
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim(),
  };
}
