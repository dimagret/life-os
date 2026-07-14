import type { Metadata } from 'next';
import CodexClient from './CodexClient';

export const metadata: Metadata = {
  title: 'Кодекс',
  description: 'Модули знаний — открываются по мере накопленных действий.',
};

export default function CodexPage() {
  return <CodexClient />;
}
