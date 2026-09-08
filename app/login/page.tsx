'use client';

import { LoginForm } from '@/components/features/LoginForm';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <LoginForm
      onLogin={(userId: string, email: string) => {
        login(userId, email);
        window.location.href = '/';
      }}
    />
  );
}
