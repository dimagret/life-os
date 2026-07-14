'use client';

import { KnowledgeModule, UiState, UserProfile } from '@/types';
import { runMigrations } from '@/lib/migrations';
import {
  createDefaultUserProfile,
  defaultKnowledgeModules,
  loadAppState,
  loadKnowledgeModules,
  loadUserProfile,
  mergeDefaultKnowledgeModules,
  saveKnowledgeModules,
  saveUserProfile,
} from './persistence';

export function bootstrapUserProfile(): UserProfile {
  const existing = loadUserProfile();
  if (existing && existing.id) {
    return existing;
  }
  const fresh = createDefaultUserProfile();
  saveUserProfile(fresh);
  return fresh;
}

export function bootstrapKnowledgeModules(): KnowledgeModule[] {
  const existing = loadKnowledgeModules();
  if (existing.length > 0) {
    const merged = mergeDefaultKnowledgeModules(existing);
    if (JSON.stringify(merged) !== JSON.stringify(existing)) {
      saveKnowledgeModules(merged);
    }
    return merged;
  }
  saveKnowledgeModules(defaultKnowledgeModules);
  return defaultKnowledgeModules;
}

export function bootstrapApp(): {
  profile: UserProfile;
  knowledgeModules: KnowledgeModule[];
  currentState: UiState;
} {
  // Run migrations FIRST: any subsequent reads expect the migrated schema.
  runMigrations();

  const profile = bootstrapUserProfile();
  const knowledgeModules = bootstrapKnowledgeModules();
  const appState = loadAppState();
  return {
    profile,
    knowledgeModules,
    currentState: appState.currentState,
  };
}
