import type { Metadata } from 'next';
import TodayClient from './TodayClient';

export const metadata: Metadata = {
  title: 'Сегодня',
  description: 'Собери день, сделай фокус и вечером разбери результат.',
};

export default function TodayPage() {
  return <TodayClient />;
}
