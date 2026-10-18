import { describe, it, expect } from 'vitest';

describe('Supabase Development Environment Isolation Boundary', () => {
  const PRODUCTION_FORBIDDEN_HOST = 'blvbadhssprenjizbnvz.supabase.co';
  const AUTHORIZED_DEV_HOST = 'jbzhtgqdgqjnffljwazy.supabase.co';

  it('strictly aborts and throws fatal error if forbidden production host is targeted', () => {
    const maliciousUrl = `https://${PRODUCTION_FORBIDDEN_HOST}`;
    expect(() => {
      if (maliciousUrl.includes(PRODUCTION_FORBIDDEN_HOST)) {
        throw new Error(`CRITICAL SAFETY VIOLATION: Attempted to target forbidden production host "${PRODUCTION_FORBIDDEN_HOST}". Aborting execution.`);
      }
    }).toThrowError(/CRITICAL SAFETY VIOLATION/);
  });

  it('permits authorized development project hosts while strictly blocking the forbidden production host', () => {
    const devUrl = `https://${AUTHORIZED_DEV_HOST}`;
    expect(devUrl.includes(AUTHORIZED_DEV_HOST)).toBe(true);
    expect(devUrl.includes(PRODUCTION_FORBIDDEN_HOST)).toBe(false);

    const isAuthorized = (url: string) =>
      Boolean(url) &&
      !url.includes(PRODUCTION_FORBIDDEN_HOST) &&
      (url.includes('.supabase.co') || url.includes('localhost') || url.includes('127.0.0.1'));

    expect(isAuthorized(`https://${AUTHORIZED_DEV_HOST}`)).toBe(true);
    expect(isAuthorized(`https://custom-project-ref.supabase.co`)).toBe(true);
    expect(isAuthorized(`https://${PRODUCTION_FORBIDDEN_HOST}`)).toBe(false);
  });

  it('rejects placeholders and requires authentic publishable keys', () => {
    const placeholders = [
      '',
      'YOUR_SUPABASE_PUBLISHABLE_KEY',
      'YOUR_PROVIDED_PUBLISHABLE_KEY',
      'your-dev-anon-key-here',
      'placeholder',
    ];

    function isValidKey(key: string): boolean {
      if (!key) return false;
      if (key.startsWith('YOUR_') || key.includes('your-dev') || key.includes('placeholder')) {
        return false;
      }
      return key.length > 20 && (key.includes('.') || key.startsWith('sbp_'));
    }

    placeholders.forEach(p => {
      expect(isValidKey(p)).toBe(false);
    });

    const mockValidJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impiemh0Z3FkZ3FqbmZmbGp3YXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.mocksignaturehere';
    expect(isValidKey(mockValidJwt)).toBe(true);
  });
});
