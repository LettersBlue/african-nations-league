'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { validateInvitationToken, acceptInvitation } from '@/app/actions/representative-invitations';
import { validateAdminInvitationToken, acceptAdminInvitation } from '@/app/actions/admin-invitations';
import Link from 'next/link';

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitationData, setInvitationData] = useState<{ email: string; country?: string; role: 'representative' | 'admin' } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. No token provided.');
      setValidating(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) return;

    setValidating(true);
    setError('');

    try {
      // Try representative invitation first
      const repResult = await validateInvitationToken(token);
      if (repResult.success && repResult.email && repResult.country) {
        setInvitationData({
          email: repResult.email,
          country: repResult.country,
          role: 'representative',
        });
        // Pre-fill display name from email (before @)
        const nameFromEmail = repResult.email.split('@')[0];
        setDisplayName(nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1));
        setValidating(false);
        return;
      }
      
      // Try admin invitation
      const adminResult = await validateAdminInvitationToken(token);
      if (adminResult.success && adminResult.email) {
        setInvitationData({
          email: adminResult.email,
          role: 'admin',
        });
        // Pre-fill display name from email (before @)
        const nameFromEmail = adminResult.email.split('@')[0];
        setDisplayName(nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1));
        setValidating(false);
        return;
      }
      
      // Neither worked - use error from the last attempt
      setError(adminResult.error || repResult.error || 'Invalid or expired invitation link');
    } catch (err: any) {
      setError(err.message || 'Failed to validate invitation');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!displayName || displayName.trim().length === 0) {
      setError('Display name is required');
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Invalid invitation token');
      setLoading(false);
      return;
    }

    try {
      let result;
      if (invitationData?.role === 'admin') {
        result = await acceptAdminInvitation(token!, password, displayName.trim());
      } else {
        result = await acceptInvitation(token!, password, displayName.trim());
      }
      
      if (result.success) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login?message=Account created successfully. Please log in.');
        }, 2000);
      } else {
        setError(result.error || 'Failed to accept invitation');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen  flex items-center justify-center p-4">
        <div className="card card-padding max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Validating invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen  flex items-center justify-center p-4">
        <div className="card card-padding max-w-md w-full">
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/login"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen  flex items-center justify-center p-4">
        <div className="card card-padding max-w-md w-full">
          <div className="text-center">
            <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Account Created!</h1>
            <p className="text-gray-600 mb-6">Your account has been created successfully. Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  flex items-center justify-center p-4">
      <div className="card card-padding max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Accept Invitation</h1>
          {invitationData?.role === 'admin' ? (
            <>
              <p className="text-gray-600">
                You've been invited to be an <strong>Administrator</strong>
              </p>
              <p className="text-sm text-gray-500 mt-1">{invitationData?.email}</p>
            </>
          ) : (
            <>
              <p className="text-gray-600">
                You've been invited to represent <strong>{invitationData?.country}</strong>
              </p>
              <p className="text-sm text-gray-500 mt-1">{invitationData?.email}</p>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="label-field">
              Full Name *
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              disabled={loading}
              className="input-field"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="password" className="label-field">
              Password *
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              className="input-field"
              placeholder="Create a password (min 6 characters)"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label-field">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              className="input-field"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card card-padding max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}

