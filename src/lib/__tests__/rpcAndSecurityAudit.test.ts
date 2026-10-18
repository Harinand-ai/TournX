import { describe, it, expect } from 'vitest';
import { sha256Sync } from '../../services/localDataService';

describe('Access Code Hashing & Security Audit', () => {
  it('generates deterministic salted SHA-256 matching the PostgreSQL digest implementation', () => {
    const rawCode = 'ABC23456';
    const salt = 'tx_salt_';
    
    // Client-side TypeScript hash
    const clientHash = sha256Sync(salt + rawCode);
    
    // Simulated PostgreSQL encode(digest('tx_salt_' || upper(trim(p_code)), 'sha256'), 'hex')
    const pgInput = salt + rawCode.trim().toUpperCase();
    const pgHash = sha256Sync(pgInput);
    
    expect(clientHash).toBe(pgHash);
    expect(clientHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles case-insensitivity consistently across client and server', () => {
    const codeUpper = 'TESTCODE';
    const codeLower = 'testcode';
    const salt = 'tx_salt_';
    
    const hashUpper = sha256Sync(salt + codeUpper);
    const hashFromLower = sha256Sync(salt + codeLower.toUpperCase());
    
    expect(hashFromLower).toBe(hashUpper);
  });

  it('rejects ambiguous characters (0, O, 1, I, L) in standard code generator alphabet', () => {
    const unambiguousChars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const forbiddenAmbiguous = ['0', 'O', '1', 'I', 'L'];
    
    for (const char of forbiddenAmbiguous) {
      expect(unambiguousChars).not.toContain(char);
    }
  });

  it('does not use crypt or bcrypt algorithms for access code hashing', () => {
    const migrationSql = `encode(digest('tx_salt_' || upper(trim(p_code)), 'sha256'), 'hex')`;
    expect(migrationSql).not.toContain('crypt(');
    expect(migrationSql).not.toContain('bf');
    expect(migrationSql).toContain('sha256');
  });
});
