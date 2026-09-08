'use client';

import { SignupForm } from '@/components/features/SignupForm';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const { signup } = useAuth();

  return (
    <SignupForm
      onSignup={(userId: string, email: string) => {
        signup(userId, email);
        window.location.href = '/';
      }}
    />
  );
}
