'use client';

import { Download, ImageUp, LogOut, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Dropdown';
import { Field, FormMessage, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/States';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { avatarUrl, deleteAccount, exportMyData, removeAvatar, updateProfile, uploadAvatar } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';

// ISO 3166-1 alpha-2 codes; names come from the browser (Intl.DisplayNames).
const COUNTRIES = 'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW'.split(' ');

function SignInFirst({ what }: { what: string }) {
  return (
    <EmptyState title={`Sign in to edit your ${what}`} action={<Link href="/login?next=/settings" className="font-semibold text-gold-300 hover:underline">Sign in</Link>}>
      Board, gameplay and computer settings work without an account and are saved on this device.
    </EmptyState>
  );
}

/** Crops to a centred square and resizes to 256×256 WebP (well under the 256 KB storage limit). */
async function toAvatarBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  for (const q of [0.85, 0.7, 0.5]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', q));
    if (blob && blob.size < 250_000) return blob;
  }
  throw new Error('That image is too complex to shrink. Try another.');
}

const friendly = (m: string) =>
  /display_name/.test(m) ? 'Display names are 1–40 characters.' : /country/.test(m) ? 'Pick a country from the list.' : /bio/.test(m) ? 'Your bio contains characters we can’t store.' : m;

export function ProfileSettings() {
  const { status, profile, userId, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setBio(profile.bio ?? '');
    setCountry(profile.country ?? '');
  }, [profile]);

  if (status !== 'signedIn' || !profile || !userId) return status === 'loading' ? null : <SignInFirst what="profile" />;
  const names = new Intl.DisplayNames(['en'], { type: 'region' });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await updateProfile(userId, { display_name: displayName.trim() || null, bio: bio.trim() || null, country: country || null });
      await refreshProfile();
      setMsg({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      setMsg({ tone: 'error', text: friendly(err instanceof Error ? err.message : 'Could not save.') });
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      await uploadAvatar(userId, await toAvatarBlob(file), profile.avatar_path);
      await refreshProfile();
      setMsg({ tone: 'success', text: 'Avatar updated.' });
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Upload failed.' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <form onSubmit={save} className="max-w-xl space-y-5">
      {msg && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
      <div className="flex items-center gap-4">
        <PlayerAvatar name={profile.username} src={avatarUrl(profile.avatar_path)} size="lg" />
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="avatar-file" onChange={(e) => void onFile(e.target.files?.[0])} />
          <Button variant="secondary" icon={<ImageUp className="size-4" />} disabled={busy} onClick={() => fileRef.current?.click()}>
            Upload avatar
          </Button>
          {profile.avatar_path && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                await removeAvatar(userId, profile.avatar_path);
                await refreshProfile();
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      <Field label="Username" value={profile.username} disabled hint="Usernames can’t be changed." />
      <Field label="Display name" maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} hint="Optional. Shown next to your username." />
      <div>
        <p className="mb-1.5 text-sm font-semibold">Country</p>
        <Select
          label="Country"
          value={country}
          onChange={setCountry}
          options={[{ value: '', label: 'Not shown' }, ...COUNTRIES.map((c) => ({ value: c, label: names.of(c) ?? c })).sort((a, b) => a.label.localeCompare(b.label))]}
        />
      </div>
      <div>
        <label htmlFor="bio" className="mb-1.5 flex justify-between text-sm font-semibold">
          Bio <span className="tabular text-xs font-normal text-fg-subtle">{bio.length}/300</span>
        </label>
        <textarea id="bio" maxLength={300} rows={4} value={bio} onChange={(e) => setBio(e.target.value)} className={cn(inputClass, 'h-auto border-line py-2.5 focus:border-gold-500/60')} />
      </div>
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}

export function AccountSettings() {
  const { status, profile, email, userId, signOut } = useAuth();
  const router = useRouter();
  const [newEmail, setNewEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);

  if (status !== 'signedIn' || !profile || !userId) return status === 'loading' ? null : <SignInFirst what="account" />;

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const { error } = await supabase().auth.updateUser({ email: newEmail.trim() }, { emailRedirectTo: `${location.origin}/auth/callback?next=/settings` });
    setMsg(error ? { tone: 'error', text: error.message } : { tone: 'success', text: `Confirm the change using the links we emailed to ${email} and ${newEmail.trim()}.` });
    if (!error) setNewEmail('');
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) return setMsg({ tone: 'error', text: 'Use at least 8 characters.' });
    if (pw !== pw2) return setMsg({ tone: 'error', text: 'The passwords don’t match.' });
    const { error } = await supabase().auth.updateUser({ password: pw });
    setMsg(error ? { tone: 'error', text: error.message } : { tone: 'success', text: 'Password changed.' });
    if (!error) setPw(''), setPw2('');
  };

  const download = async () => {
    const data = await exportMyData(userId);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `rookery-${profile.username}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await deleteAccount();
      await signOut();
      router.replace('/?deleted=1');
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Could not delete the account.' });
      setDeleting(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl space-y-8">
      {msg && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
      <section>
        <h3 className="text-sm font-semibold">Email</h3>
        <p className="mt-1 text-sm text-fg-muted">{email}</p>
        <form onSubmit={changeEmail} className="mt-3 flex gap-2">
          <input type="email" aria-label="New email address" placeholder="New email address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={cn(inputClass, 'border-line focus:border-gold-500/60')} />
          <Button type="submit" variant="secondary" disabled={!newEmail.includes('@')}>
            Change
          </Button>
        </form>
      </section>
      <section>
        <h3 className="text-sm font-semibold">Password</h3>
        <form onSubmit={changePassword} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Field label="Confirm" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          <Button type="submit" variant="secondary" disabled={!pw}>
            Update
          </Button>
        </form>
      </section>
      <section className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={<LogOut className="size-4" />} onClick={async () => { await signOut('global'); router.replace('/login'); }}>
          Sign out everywhere
        </Button>
        <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void download()}>
          Download my data
        </Button>
      </section>
      <section className="rounded-[14px] border border-loss/30 p-5">
        <h3 className="text-sm font-semibold text-loss">Delete account</h3>
        <p className="mt-1 text-sm text-fg-muted">Permanently removes your profile, settings, ratings, achievements and avatar. Your games stay in opponents’ histories without your name.</p>
        <Button className="mt-3" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(true)}>
          Delete my account
        </Button>
      </section>
      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete your account?"
        description="This can’t be undone."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={busy || confirmName !== profile.username} onClick={() => void doDelete()}>
              {busy ? 'Deleting…' : 'Delete forever'}
            </Button>
          </>
        }
      >
        <Field label={<>Type <strong>{profile.username}</strong> to confirm</>} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
      </Modal>
    </div>
  );
}
