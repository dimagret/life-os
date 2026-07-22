import { afterEach, describe, expect, it } from 'vitest';
import { isSupabaseConfigured } from '@/lib/supabase/config';

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});

describe('Supabase public configuration', () => {
  it('rejects example placeholder credentials', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_your_key';

    expect(isSupabaseConfigured()).toBe(false);
  });

  it('rejects a secret key in a public environment variable', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project-ref.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_example';

    expect(isSupabaseConfigured()).toBe(false);
  });
});
