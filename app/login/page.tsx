'use client';

import { useEffect } from 'react';
import { LoginForm } from '@/components/features/LoginForm';
import { AuthLoading } from '@/components/layout/AuthLoading';
import { useAuth } from '@/hooks/useAuth';
import { readSafeNextPath } from '@/lib/auth/client';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const nextPath = readSafeNextPath(new URLSearchParams(window.location.search).get('next'));
      window.location.replace(nextPath);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || isAuthenticated) return <AuthLoading />;

  return (
    <LoginForm
      onLogin={async (session) => {
        await login(session);
        const nextPath = readSafeNextPath(new URLSearchParams(window.location.search).get('next'));
        window.location.assign(nextPath);
      }}
    />
  );
}
