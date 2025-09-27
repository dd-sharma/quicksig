import React, { useEffect, useState } from 'react';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await User.me();
        if (!currentUser) {
          // This will trigger login flow handled by base44 if not authenticated
          await User.login();
          return;
        }
        setUser(currentUser);
        if (!currentUser.onboarded) {
          navigate(createPageUrl('Onboarding'));
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Authentication check failed", error);
        await User.login();
      }
    };

    checkUser();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return children;
}