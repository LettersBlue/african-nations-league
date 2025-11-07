'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle, updateUserProfile } from '@/lib/firebase/auth';
import { createUser } from '@/lib/firebase/firestore';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';

export default function RegisterForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGoogleComplete = searchParams.get('complete') === 'true';

  // Get current Firebase user when completing Google registration
  useEffect(() => {
    if (isGoogleComplete) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setCurrentUser(firebaseUser);
          // Pre-fill display name from Google
          if (firebaseUser.displayName) {
            setDisplayName(firebaseUser.displayName);
          }
          // Pre-fill email from Google
          if (firebaseUser.email) {
            setEmail(firebaseUser.email);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [isGoogleComplete]);

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Create Firebase Auth account
      const authResult = await signUpWithEmail(email, password);
      
      if (!authResult.success || !authResult.user) {
        setError(authResult.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      // Update display name in Firebase Auth
      if (authResult.user && displayName) {
        try {
          await updateUserProfile(authResult.user, displayName);
        } catch (err) {
          console.error('Failed to update display name:', err);
          // Continue anyway - display name will be saved in Firestore
        }
      }

      // Create user document in Firestore (always as visitor)
      try {
        await createUser({
          uid: authResult.user.uid,
          email,
          displayName,
          role: 'visitor',
        });
      } catch (userDocError: any) {
        console.error('Error creating user document:', userDocError);
        setError(
          userDocError.code === 'permission-denied' || userDocError.code === 'unavailable'
            ? 'Firestore API is not enabled. Please enable Cloud Firestore API in Firebase Console: https://console.firebase.google.com/project/roadtoglory-eae7b/firestore'
            : `Account created but failed to save user data: ${userDocError.message || 'Unknown error'}. Please contact support.`
        );
        setLoading(false);
        return;
      }

      // Redirect to home page
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!currentUser) {
      setError('Please sign in with Google first');
      setLoading(false);
      return;
    }

    if (!displayName.trim()) {
      setError('Full name is required');
      setLoading(false);
      return;
    }

    try {
      // Update display name in Firebase Auth if it changed
      if (currentUser.displayName !== displayName.trim()) {
        try {
          await updateUserProfile(currentUser, displayName.trim());
        } catch (err) {
          console.error('Failed to update display name:', err);
          // Continue anyway - display name will be saved in Firestore
        }
      }

      // Create user document in Firestore (always as visitor)
      try {
        await createUser({
          uid: currentUser.uid,
          email: currentUser.email || email,
          displayName: displayName.trim(),
          role: 'visitor',
        });
      } catch (userDocError: any) {
        console.error('Error creating user document:', userDocError);
        setError(
          userDocError.code === 'permission-denied' || userDocError.code === 'unavailable'
            ? 'Firestore API is not enabled. Please enable Cloud Firestore API in Firebase Console.'
            : 'Failed to save user data: ' + (userDocError.message || 'Unknown error')
        );
        setLoading(false);
        return;
      }

      // Redirect to home page
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');

    try {
      // Sign in with Google
      const result = await signInWithGoogle();
      
      if (result.success && result.user) {
        // Create user document in Firestore (always as visitor)
        try {
          await createUser({
            uid: result.user.uid,
            email: result.user.email || email,
            displayName: result.user.displayName || displayName || 'User',
            role: 'visitor',
          });
        } catch (userDocError: any) {
          console.error('Error creating user document:', userDocError);
          setError(
            userDocError.code === 'permission-denied' || userDocError.code === 'unavailable'
              ? 'Firestore API is not enabled. Please enable Cloud Firestore API in Firebase Console.'
              : 'Failed to save user data: ' + (userDocError.message || 'Unknown error')
          );
          setLoading(false);
          return;
        }

        // Redirect to home page
        router.push('/');
      } else {
        setError(result.error || 'Failed to sign in with Google');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={isGoogleComplete ? handleGoogleComplete : handleEmailRegister} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isGoogleComplete && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
          You've signed in with Google. Please enter your full name to complete registration.
        </div>
      )}

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

      {!isGoogleComplete && (
        <>
          <div>
            <label htmlFor="email" className="label-field">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="input-field"
              placeholder="Enter your email"
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
        </>
      )}

      {isGoogleComplete ? (
        <button
          type="submit"
          disabled={loading || !currentUser}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Completing registration...' : 'Continue'}
        </button>
      ) : (
        <>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={loading}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </>
      )}

      <div className="text-center text-sm">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
