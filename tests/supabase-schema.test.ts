import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/202607200001_activation_accounts.sql'), 'utf8');

describe('Supabase account storage schema', () => {
  it('keeps every state row private to the authenticated user', () => {
    expect(sql).toContain('user_id uuid primary key references auth.users(id) on delete cascade');
    expect(sql).toContain('alter table public.user_states enable row level security');
    expect(sql).toContain('to authenticated');
    expect(sql).toContain('(select auth.uid()) = user_id');
    expect(sql).not.toContain('to anon');
  });
});
