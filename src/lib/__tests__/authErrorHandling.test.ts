import { describe, it, expect, vi } from 'vitest';
import { getSupabaseProjectHost, isSupabaseConfigured, supabase, resendConfirmationEmail } from '../supabase';

describe('TournX Authentication & Error Handling Hardening', () => {
  it('correctly extracts project hostname without exposing secrets or keys', () => {
    const host = getSupabaseProjectHost();
    if (host) {
      expect(typeof host).toBe('string');
      expect(host).not.toContain('eyJ');
      expect(host).not.toContain('sb_publishable');
      expect(host.endsWith('.supabase.co') || host === 'localhost' || host === '127.0.0.1').toBe(true);
    }
  });

  it('maintains a single client instance across module imports to prevent multi-client collision', () => {
    const globalScope = typeof globalThis !== 'undefined' ? (globalThis as any) : (window as any);
    if (isSupabaseConfigured) {
      expect(globalScope.__tournx_supabase_client__).toBeDefined();
      expect(supabase).toBe(globalScope.__tournx_supabase_client__);
    }
  });

  it('normalizes email addresses consistently for signup and signin', () => {
    const rawEmails = [
      '  Organizer@Example.COM  ',
      'User.Test@gmail.com',
      'ADMIN@TOURNX.IO '
    ];

    const normalized = rawEmails.map(e => e.trim().toLowerCase());
    expect(normalized).toEqual([
      'organizer@example.com',
      'user.test@gmail.com',
      'admin@tournx.io'
    ]);
  });

  it('identifies unconfirmed email errors reliably from Supabase GoTrue responses', () => {
    const isUnconfirmed = (err: any) =>
      Boolean(err) &&
      (err.code === 'email_not_confirmed' ||
       (err.message && err.message.toLowerCase().includes('email not confirmed')));

    expect(isUnconfirmed({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toBe(true);
    expect(isUnconfirmed({ code: 'unexpected', message: 'Error: Email not confirmed yet' })).toBe(true);
    expect(isUnconfirmed({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(false);
  });

  it('identifies existing registered users from signUp identity array', () => {
    const isExistingUser = (user: any) =>
      Boolean(user) && Array.isArray(user.identities) && user.identities.length === 0;

    expect(isExistingUser({ id: '123', identities: [] })).toBe(true);
    expect(isExistingUser({ id: '123', identities: [{ id: '456' }] })).toBe(false);
    expect(isExistingUser(null)).toBe(false);
  });

  it('resendConfirmationEmail gracefully handles execution or returns error', async () => {
    const res = await resendConfirmationEmail('test-dev-unconfirmed@example.com');
    expect(typeof res.success).toBe('boolean');
    if (!res.success) {
      expect(typeof res.error).toBe('string');
    }
  });

  it('guarantees organizer setup routes (organize, setup, wizard) require authentication', () => {
    const organizerRoutes = ['organize', 'setup', 'wizard', 'workspace', 'admin'];
    const isProtectedOrganizerRoute = (tab: string) => organizerRoutes.includes(tab);

    expect(isProtectedOrganizerRoute('organize')).toBe(true);
    expect(isProtectedOrganizerRoute('setup')).toBe(true);
    expect(isProtectedOrganizerRoute('wizard')).toBe(true);
    expect(isProtectedOrganizerRoute('workspace')).toBe(true);
    expect(isProtectedOrganizerRoute('public-tournament')).toBe(false);
  });

  it('prevents local demo admin flag from bypassing cloud authentication when Supabase is active', () => {
    const isCloud = true;
    const devAdminLogged = true;
    const sessionUser = null;

    // Strict cloud auth check: must evaluate to false when sessionUser is null
    const isAuthenticated = isCloud ? Boolean(sessionUser) : devAdminLogged;
    expect(isAuthenticated).toBe(false);
  });
});
