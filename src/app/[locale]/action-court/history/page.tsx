import type { Metadata } from 'next';
import ReviewHistoryClient from '@/components/court/ReviewHistoryClient';

export const metadata: Metadata = {
  title: 'История разборов',
  description: 'Сохранённые итоги дня, причины, задачи и восстановление.',
};

export default function ReviewHistoryPage() {
  return <ReviewHistoryClient />;
}
