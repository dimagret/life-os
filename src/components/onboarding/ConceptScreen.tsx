'use client';

import styles from './Onboarding.module.css';
interface ConceptScreenProps { onNext: () => void; }
const concepts = [
  ['01', 'Собери день', 'Выбери один результат и три выполнимых шага.'],
  ['02', 'Сделай фокус', 'Запускай рабочий блок прямо из выбранной задачи.'],
  ['03', 'Разбери результат', 'Вечером зафиксируй факт, вывод и правку на завтра.'],
] as const;

export function ConceptScreen({ onNext }: ConceptScreenProps) {
  return (
    <main className={styles.panel}>
      <div className={styles.heading}>
        <p className={styles.kicker}>Контур дня</p>
        <h1>Один экран. Один смысл. Следующее действие.</h1>
        <p>Life OS удерживает день в коротком цикле без лишнего списка привычек.</p>
      </div>
      <ol className={styles.sequence}>
        {concepts.map(([number, title, description]) => (
          <li key={number}>
            <span className={styles.sequenceNumber}>{number}</span>
            <span><strong>{title}</strong><small>{description}</small></span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onNext} className={styles.primary}>Выбрать уровень строгости</button>
    </main>
  );
}
