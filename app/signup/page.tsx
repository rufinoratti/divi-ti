'use client';

import { useEffect } from 'react';
import { SignupForm } from '@/components/features/SignupForm';
import { AuthLoading } from '@/components/layout/AuthLoading';
import { useAuth } from '@/hooks/useAuth';
import { readSafeNextPath } from '@/lib/auth/client';

export default function SignupPage() {
  const { signup, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const nextPath = readSafeNextPath(new URLSearchParams(window.location.search).get('next'));
      window.location.replace(nextPath);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || isAuthenticated) return <AuthLoading />;

  return (
    <SignupForm
      onSignup={async (session) => {
        await signup(session);
        const nextPath = readSafeNextPath(new URLSearchParams(window.location.search).get('next'));
        window.location.assign(nextPath);
      }}
    />
  );
}
