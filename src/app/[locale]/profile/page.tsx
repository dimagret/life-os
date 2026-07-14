import type { Metadata } from 'next';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
  title: 'Профиль',
  description: 'Прогресс, режим строгости, тема, язык, демо-данные.',
};

export default function ProfilePage() {
  return <ProfileClient />;
}
