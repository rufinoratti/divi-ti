'use client';

import { SignupForm } from '@/components/features/SignupForm';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const { signup } = useAuth();

  return (
    <SignupForm
      onSignup={async (session) => {
        await signup(session);
        window.location.assign('/');
      }}
    />
  );
}
