import type { Metadata } from 'next';
import ReviewHistoryDetailClient from '@/components/court/ReviewHistoryDetailClient';

export const metadata: Metadata = {
  title: 'Сохранённый разбор',
  description: 'Подробный итог выбранного дня.',
};

export default async function ReviewHistoryDetailPage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  return <ReviewHistoryDetailClient reviewId={reviewId} />;
}
