'use client';

import { LoginForm } from '@/components/features/LoginForm';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <LoginForm
      onLogin={async (session) => {
        await login(session);
        window.location.assign('/');
      }}
    />
  );
}
