'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUser } from '@/lib/firebase/firestore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

/**
 * Admin Back Button Component
 * Shows a back button to admin dashboard when an admin is viewing the public bracket
 * Uses shadcn Button component with glass morphism styling
 */
export default function AdminBackButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await getUser(firebaseUser.uid);
          if (userData && userData.role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <div className="mb-6">
      <Button
        asChild
        variant="outline"
        size="default"
        className="btn-back-admin-shadcn"
      >
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>
    </div>
  );
}
