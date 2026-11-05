import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

const base = {
  DATABASE_URL: 'postgres://x',
  JWT_SECRET: 'x'.repeat(40),
  PUBLIC_BASE_URL: 'http://localhost:3000',
};
const prod = {
  ...base,
  NODE_ENV: 'production',
  PUBLIC_BASE_URL: 'https://api.ornek.com.tr',
  SMTP_URL: 'smtp://u:p@mail:587',
  CONTACT_EMAIL: 'destek@ornek.com.tr',
  MAIL_FROM: 'RoastCost <no-reply@ornek.com.tr>',
  DATA_CONTROLLER: 'Örnek Kahve Ltd.',
};

describe('environment configuration', () => {
  it('development works with local defaults', () => {
    expect(loadConfig(base).PUBLIC_BASE_URL).toBe('http://localhost:3000');
  });
  it('missing required variables fail fast with a readable message', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ ...base, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });
  it('production refuses placeholders and plain http', () => {
    expect(loadConfig(prod).NODE_ENV).toBe('production');
    expect(() => loadConfig({ ...prod, PUBLIC_BASE_URL: 'http://api.ornek.com.tr' })).toThrow(
      /https/,
    );
    expect(() => loadConfig({ ...prod, CONTACT_EMAIL: undefined })).toThrow(/CONTACT_EMAIL/);
    expect(() => loadConfig({ ...prod, SMTP_URL: undefined })).toThrow(/SMTP_URL/);
  });
});
