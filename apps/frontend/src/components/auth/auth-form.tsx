'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authApi, getToken, setToken } from '@/lib/api';

/** Only follow same-site paths from ?next= so the link can't redirect off the app. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const next = safeNext(searchParams.get('next'));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in: skip the form
  useEffect(() => {
    if (getToken()) router.replace(next);
  }, [router, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'register') await authApi.register(email, password, name);
      const { access_token } = await authApi.login(email, password);
      setToken(access_token);
      queryClient.clear();
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  const isLogin = mode === 'login';
  const otherHref = `${isLogin ? '/register' : '/login'}${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold">Content Intelligence OS</span>
          </Link>
          <CardTitle className="text-2xl">{isLogin ? 'Sign in' : 'Create your account'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Use the email and password you registered with.' : 'You will be signed in right after.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                  Name <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? 'No account yet? ' : 'Already have an account? '}
            <Link href={otherHref} className="font-medium text-primary hover:underline">
              {isLogin ? 'Create one' : 'Sign in'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
