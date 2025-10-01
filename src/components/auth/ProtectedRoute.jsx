
import React, { useEffect, useState } from 'react';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

// Simple 30s TTL cache + in-flight coalescing for User.me()
let __authCache = { ts: 0, user: undefined, inFlight: null };
const AUTH_TTL_MS = 30_000; // 30 seconds

// Preserve the original method to avoid recursion
const originalUserMe = User.me;

const cachedUserMe = async () => {
  const now = Date.now();

  // If there's an in-flight request, return its promise to coalesce requests
  if (__authCache.inFlight) {
    return __authCache.inFlight;
  }

  // If cache is valid (not undefined and not expired), return cached user
  if (__authCache.user !== undefined && now - __authCache.ts < AUTH_TTL_MS) {
    return __authCache.user;
  }

  // No valid cache, initiate a new request using the ORIGINAL method to avoid recursion
  __authCache.inFlight = originalUserMe().then(
    (u) => {
      // On success, update cache with the user and timestamp, clear inFlight
      __authCache = { ts: now, user: u, inFlight: null };
      return u;
    },
    (err) => {
      // On error, update cache to null (to prevent immediate re-fetching on error), clear inFlight
      // This also implicitly handles cases where User.me might throw due to 429 or other errors,
      // preventing immediate retries for the TTL duration.
      __authCache = { ts: now, user: null, inFlight: null };
      throw err; // Re-throw the error so downstream callers can handle it
    }
  );

  return __authCache.inFlight; // Return the promise for the current request
};

// Route-level caching: replace local usage of User.me with cached version
User.me = cachedUserMe;

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        // This now calls the cachedUserMe function via the overridden User.me
        const currentUser = await User.me();
        
        if (!currentUser) {
          // This will trigger login flow handled by base44 if not authenticated
          // This typically means the user is not logged in, or the session expired.
          // The User.login() function should redirect to the login page or handle auth.
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
        // If User.me throws an error (e.g., network issue, server error, or explicit throw from cachedUserMe),
        // we attempt to trigger the login flow.
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

  // If user is loaded and onboarded, render children
  // If user is loaded but not onboarded, the navigate call in useEffect takes precedence.
  return children;
}
