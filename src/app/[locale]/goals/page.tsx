import type { Metadata } from 'next';
import GoalsClient from './GoalsClient';

export const metadata: Metadata = {
  title: 'Цели',
  description: 'Цели на внешний результат. Без фантазии, с дедлайном и реалистичностью.',
};

export default function GoalsPage() {
  return <GoalsClient />;
}
