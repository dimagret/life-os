export const STORAGE_KEYS = {
  userProfile: 'lifeos:userProfile',
  goals: 'lifeos:goals',
  tasks: 'lifeos:tasks',
  dayPlans: 'lifeos:dayPlans',
  focusBlocks: 'lifeos:focusBlocks',
  activeFocusSession: 'lifeos:activeFocusSession',
  actionCourtReviews: 'lifeos:actionCourtReviews',
  weeklyGrowthReviews: 'lifeos:weeklyGrowthReviews',
  debts: 'lifeos:debts',
  recoveryQuests: 'lifeos:recoveryQuests',
  knowledgeModules: 'lifeos:knowledgeModules',
  appState: 'lifeos:appState',
  schemaVersion: 'lifeos:schemaVersion',
  theme: 'lifeos:theme',
  locale: 'lifeos:locale',
} as const;

// Bump this when changing the localStorage schema (User/Goal/Task/etc.).
// Add a corresponding entry to `migrations` in src/lib/migrations.ts.
export const STORAGE_SCHEMA_VERSION = 3;
