import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = { title: 'Sign in · Content Intelligence OS' };

export default function Page() {
  // AuthForm reads ?next=, which needs a Suspense boundary for static rendering
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
