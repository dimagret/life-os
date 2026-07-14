'use client';

import { useState } from 'react';
import { StrictnessMode } from '@/types';
import styles from './Onboarding.module.css';
interface ModeSelectionProps { onSelect: (mode: StrictnessMode) => void; }
interface ModeOption { value: StrictnessMode; title: string; description: string; badge: string; locked?: boolean; }
const modes: ModeOption[] = [
  { value: 'soft', title: 'Мягкий старт', description: 'Больше подсказок, меньше последствий.', badge: 'Старт' },
  { value: 'standard', title: 'Стандарт', description: 'Баланс контроля и восстановления.', badge: 'Рекомендуется' },
  { value: 'hard', title: 'Строгий', description: 'Обязательный разбор и доказательства.', badge: 'Строго' },
  { value: 'owner', title: 'Максимальный', description: 'Откроется после серии честных разборов.', badge: 'Закрыт', locked: true },
];

export function ModeSelection({ onSelect }: ModeSelectionProps) {
  const [selected, setSelected] = useState<StrictnessMode>('standard');
  return (
    <main className={styles.panel}>
      <div className={styles.heading}>
        <p className={styles.kicker}>Режим контроля</p>
        <h1>Выбери уровень строгости.</h1>
        <p>Его можно изменить позже в профиле.</p>
      </div>
      <div className={styles.modeGrid}>
        {modes.map((mode) => {
          const isSelected = selected === mode.value && !mode.locked;
          return (
            <button key={mode.value} type="button" className={styles.mode} data-selected={isSelected ? 'true' : undefined} aria-pressed={isSelected} aria-disabled={mode.locked} onClick={() => { if (!mode.locked) setSelected(mode.value); }}>
              <span className={styles.modeTopline}><strong>{mode.title}</strong><small>{mode.badge}</small></span>
              <span>{mode.description}</span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onSelect(selected)} className={styles.primary}>Сохранить и начать</button>
    </main>
  );
}
