import type { Metadata } from 'next';
import ActionCourtClient from './ActionCourtClient';

export const metadata: Metadata = {
  title: 'Разбор дня',
  description: 'Вечерний разбор дня: факт, вывод и правка на завтра.',
};

export default function ActionCourtPage() {
  return <ActionCourtClient />;
}

