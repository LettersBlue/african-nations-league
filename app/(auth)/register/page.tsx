import { Suspense } from 'react';
import RegisterForm from '@/components/auth/RegisterForm';

function RegisterContent() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card card-padding w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join the African Nations League</p>
        </div>
        
        <RegisterForm />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}