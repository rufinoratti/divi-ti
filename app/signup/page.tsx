'use client';

import { SignupForm } from '@/components/features/SignupForm';
import { AuthLoading } from '@/components/layout/AuthLoading';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const { signup, isLoading } = useAuth();

  if (isLoading) return <AuthLoading />;

  return (
    <SignupForm
      onSignup={async (session) => {
        await signup(session);
        window.location.assign('/');
      }}
    />
  );
}
