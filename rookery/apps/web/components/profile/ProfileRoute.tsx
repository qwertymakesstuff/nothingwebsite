'use client';

import { useEffect, useState } from 'react';
import { ProfileView } from './ProfileView';

/**
 * Every /u/<username> URL is served this one prerendered page (the Worker rewrites it), so the
 * username comes from the address bar rather than from build-time params.
 */
export function ProfileRoute() {
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    const m = location.pathname.match(/^\/u\/([^/]+)/);
    setUsername(m ? decodeURIComponent(m[1]!) : null);
  }, []);
  useEffect(() => {
    if (username) document.title = `${username} · Rookery`;
  }, [username]);
  return <ProfileView username={username} />;
}
