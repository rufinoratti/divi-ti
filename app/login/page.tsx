'use client';

import { LoginForm } from '@/components/features/LoginForm';
import { AuthLoading } from '@/components/layout/AuthLoading';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  if (isLoading) return <AuthLoading />;

  return (
    <LoginForm
      onLogin={async (session) => {
        await login(session);
        window.location.assign('/');
      }}
    />
  );
}
