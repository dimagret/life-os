'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  bootstrapKnowledgeModules,
  loadDebts,
  loadDayPlans,
  loadFocusBlocks,
  loadRecoveryQuests,
  loadActionCourtReviews,
  saveKnowledgeModules,
} from '@/lib/storage';
import { KnowledgeModule } from '@/types';
import { CodexList } from '@/components/codex/CodexList';
import { KnowledgeModuleView } from '@/components/codex/KnowledgeModuleView';
import { PageSkeleton } from '@/components/ui/Skeleton';

interface UnlockProgress {
  focusBlocksCount: number;
  recoveryQuestsCount: number;
  courtReviewsCount: number;
  dayPlansCount: number;
  falseRestCount: number;
  closedDebtsCount: number;
  hasFailure: boolean;
}

function shouldUnlockModule(module: KnowledgeModule, progress: UnlockProgress): boolean {
  if (module.unlocked) return true;

  switch (module.id) {
    case 'km-discipline-vs-motivation':
      return progress.courtReviewsCount >= 1;
    case 'km-learning-without-action':
      return progress.focusBlocksCount >= 3;
    case 'km-recovery-after-failure':
      return progress.recoveryQuestsCount >= 1 || progress.hasFailure;
    case 'km-false-rest':
      return progress.falseRestCount >= 1;
    case 'km-self-promise':
      return progress.closedDebtsCount >= 1;
    case 'km-goal-map-resource-action':
      return progress.dayPlansCount >= 1;
    case 'km-feedback-loop-action-correction':
      return progress.courtReviewsCount >= 1;
    default:
      return false;
  }
}

export default function CodexClient() {
  const t = useTranslations('codex');
  const [modules, setModules] = useState<KnowledgeModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<KnowledgeModule | null>(null);
  const [progress, setProgress] = useState<UnlockProgress>({
    focusBlocksCount: 0,
    recoveryQuestsCount: 0,
    courtReviewsCount: 0,
    dayPlansCount: 0,
    falseRestCount: 0,
    closedDebtsCount: 0,
    hasFailure: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    function loadData() {
      const loaded = bootstrapKnowledgeModules();
      if (!isActive) return;

      // Load progress data
      const focusBlocks = loadFocusBlocks();
      const recoveryQuests = loadRecoveryQuests();
      const reviews = loadActionCourtReviews();
      const dayPlans = loadDayPlans();
      const debts = loadDebts();

      const nextProgress = {
        focusBlocksCount: focusBlocks.length,
        recoveryQuestsCount: recoveryQuests.length,
        courtReviewsCount: reviews.length,
        dayPlansCount: dayPlans.length,
        falseRestCount: reviews.filter((r) => r.falseRestDetected).length,
        closedDebtsCount: debts.filter((d) => d.status === 'closed').length,
        hasFailure: reviews.some(
          (r) => r.verdict === 'failure' || r.verdict === 'self_deception' || r.failedTaskIds.length > 0
        ),
      };

      const unlocked = loaded.map((module) => ({
        ...module,
        unlocked: shouldUnlockModule(module, nextProgress),
      }));
      if (JSON.stringify(unlocked) !== JSON.stringify(loaded)) {
        saveKnowledgeModules(unlocked);
      }

      setModules(unlocked);
      setProgress(nextProgress);

      setIsLoading(false);
    }
    loadData();
    return () => { isActive = false; };
  }, []);

  const handleOpenModule = (moduleId: string) => {
    const selectedMod = modules.find((m) => m.id === moduleId);
    if (selectedMod) {
      setSelectedModule(selectedMod);
    }
  };

  const handleBack = () => {
    setSelectedModule(null);
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (selectedModule) {
    return (
      <KnowledgeModuleView
        module={selectedModule}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="app-page"
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {t('title')}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {t('subtitle')}
        </p>
      </header>

      <CodexList
        modules={modules}
        progress={progress}
        onOpenModule={handleOpenModule}
      />
    </div>
  );
}
