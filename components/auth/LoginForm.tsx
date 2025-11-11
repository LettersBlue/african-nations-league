'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { getUser, createUser } from '@/lib/firebase/firestore';
import Link from 'next/link';

const getFriendlyAuthMessage = (rawMessage: string | undefined) => {
  if (!rawMessage) {
    return 'We could not sign you in. Please try again.';
  }

  const match = rawMessage.match(/\(auth\/([^)]+)\)/);
  const code = match ? match[1] : rawMessage;

  switch (code) {
    case 'invalid-credential':
    case 'wrong-password':
    case 'user-not-found':
    case 'invalid-password':
      return 'The email or password you entered is incorrect. Check your details and try again.';
    case 'invalid-email':
      return 'That email address does not look right. Please fix it and try again.';
    case 'too-many-requests':
      return 'Too many unsuccessful attempts. Reset your password or try again in a few minutes.';
    case 'user-disabled':
      return 'This account has been disabled. Contact support if you think this is a mistake.';
    case 'network-request-failed':
      return 'We could not reach the server. Please check your internet connection and try again.';
    case 'popup-closed-by-user':
    case 'cancelled-popup-request':
      return 'The sign-in popup was closed before completing. Please try again.';
    default:
      return 'We could not sign you in right now. Please try again shortly.';
  }
};

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signInWithEmail(email, password);
      
      if (result.success && result.user) {
        // Wait a moment for auth state to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get user data from Firestore using client SDK (has auth context)
        try {
          let userData = await getUser(result.user.uid);
          
          // If user doesn't exist in Firestore, create it automatically (for old accounts)
          if (!userData) {
            console.log('User not found in Firestore, creating profile automatically...');
            try {
              // Create user document directly with client SDK (has auth context)
              await createUser({
                uid: result.user.uid,
                email: result.user.email || '',
                displayName: result.user.displayName || 'User',
                role: 'visitor', // Default role, user can update later
              });
              
              // Fetch the newly created user
              userData = await getUser(result.user.uid);
            } catch (createError: any) {
              console.error('Failed to auto-create user profile:', createError);
              // If creation fails, redirect to registration
              setError('Please complete your profile registration.');
              router.push('/register');
              setLoading(false);
              return;
            }
          }
          
          // Redirect based on role
          if (userData && userData.role === 'admin') {
            router.push('/admin');
          } else if (userData && userData.role === 'representative') {
            router.push('/representative');
          } else {
            router.push('/');
          }
        } catch (firestoreError: any) {
          console.error('Error fetching user data:', firestoreError);
          setError(`Failed to load user profile: ${firestoreError.message || 'Unknown error'}`);
          setLoading(false);
          return;
        }
      } else {
        setError(getFriendlyAuthMessage(result.error));
      }
    } catch (err: any) {
      setError(getFriendlyAuthMessage(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithGoogle();
      
      if (result.success && result.user) {
        // Get user data from Firestore using client SDK (has auth context)
        const userData = await getUser(result.user.uid);
        
        // If user doesn't exist in Firestore, redirect to role selection
        if (!userData) {
          router.push('/register?complete=true');
          return;
        }
        
        // Redirect based on role
        if (userData.role === 'admin') {
          router.push('/admin');
        } else if (userData.role === 'representative') {
          router.push('/representative');
        } else {
          router.push('/');
        }
      } else {
        // Provide helpful error message for Google sign-in not enabled
        if (result.error?.includes('operation-not-allowed')) {
          setError('Google sign-in is not enabled. Please enable it in Firebase Console: Authentication > Sign-in method > Google > Enable.');
        } else {
          setError(getFriendlyAuthMessage(result.error));
        }
      }
    } catch (err: any) {
      if (err.message?.includes('operation-not-allowed')) {
        setError('Google sign-in is not enabled. Please enable it in Firebase Console: Authentication > Sign-in method > Google > Enable.');
      } else {
        setError(getFriendlyAuthMessage(err?.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleEmailLogin} className="space-y-6">
      {error && (
        <div className="error-message-black">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="label-field">
          Email Address
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
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="input-field"
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing in...' : 'Sign In'}
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
        onClick={handleGoogleLogin}
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

      <div className="text-center text-sm">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign up
          </Link>
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or</span>
        </div>
      </div>

      <div className="text-center">
        <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700 text-sm">
          Forgot password
        </Link>
      </div>
    </form>
  );
}
