import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app] = await Promise.all([
  readFile(new URL('./index.html', import.meta.url), 'utf8'),
  readFile(new URL('./app.mjs', import.meta.url), 'utf8'),
]);

test('login credentials cannot fall back to a hosting POST or URL submission', () => {
  const form = html.match(/<form id="signinForm"[^>]*>/)?.[0];
  assert.ok(form, 'login form exists');
  assert.doesNotMatch(form, /\bmethod\s*=\s*["'](?:get|post)["']/i);
  assert.match(form, /onsubmit="return false"/);
});

test('module load failure is shown in the page without submitting the form', () => {
  assert.match(html, /Das Anmeldemodul konnte nicht geladen werden/);
  assert.match(html, /window\.addEventListener\("error"/);
});

test('authentication uses the existing GastroPilot Supabase project and has distinct failure messages', () => {
  assert.match(app, /https:\/\/sjnwfwcpgwsavygewwzb\.supabase\.co/);
  assert.match(app, /signInWithPassword/);
  assert.match(app, /Zu viele Anmeldeversuche/);
  assert.match(app, /E-Mail oder Passwort stimmen nicht/);
  assert.match(app, /Anmeldedienst nicht erreichbar/);
});
