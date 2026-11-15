import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { editorialParagraphs, repeatedProse, collectChangedMarkdown } from './lib/content-prose-guard';

const paragraph = (city: string, n: number) => `${city} has a particular winter article whose meaningful original reporting should not be copied into another place simply by changing the name. This paragraph discusses a distinct local question and contains enough substantive words for comparison, with example ${n} retained consistently in both copies. Several additional details make this a substantial narrative passage rather than a brief common fact.`;
const original = [1, 2, 3, 4].map(n => paragraph('Abbotsford', n)).join('\n\n');

describe('content prose guard', () => {
  it('rejects substantive paragraphs copied by substituting a city name', () => {
    assert.equal(repeatedProse(original, original.replaceAll('Abbotsford', 'Aldergrove')).flagged, true);
  });

  it('allows artwork credits and short shared facts', () => {
    const credits = original.split('\n\n').map(text => '*Hero and share artwork: ' + text).join('\n\n');
    assert.equal(repeatedProse(original, 'A short shared weather fact.\n\n' + credits).flagged, false);
  });

  it('excludes only the credit paragraph, retaining following editorial prose', () => {
    assert.equal(editorialParagraphs('*Photo credit: ' + original).length, 3);
  });

  it('discovers committed, staged, unstaged and untracked Markdown', () => {
    const changed = collectChangedMarkdown(command => {
      if (command === 'git rev-parse origin/main' || command === 'git rev-parse HEAD') return 'same';
      if (command.includes('HEAD^...HEAD')) return 'src/content/legacy/blog/committed.md';
      if (command.includes('diff --name-only HEAD --')) return 'src/content/legacy/blog/unstaged.md\nsrc/content/legacy/blog/staged.md';
      if (command.includes('ls-files')) return 'src/content/legacy/blog/untracked.md';
      return '';
    });
    assert.deepEqual(changed.sort(), ['committed.md', 'staged.md', 'unstaged.md', 'untracked.md']);
  });

  it('fails validation for a real invalid untracked article and retains staged additions in scope', () => {
    const root = mkdtempSync(join(tmpdir(), 'plow-content-regression-'));
    try {
      mkdirSync(join(root, 'src/content/legacy/blog'), { recursive: true });
      mkdirSync(join(root, 'public/blog-images'), { recursive: true });
      const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' }).toString();
      git('init', '-q');
      git('config', 'user.name', 'Local regression fixture');
      git('config', 'user.email', 'fixture@example.invalid');
      writeFileSync(join(root, 'README.md'), 'Fixture only');
      git('add', '.');
      git('commit', '-qm', 'fixture baseline');
      writeFileSync(join(root, 'src/content/legacy/blog/untracked.md'), '# Missing metadata and hero\n\nA deliberately invalid new article.');
      const command = spawnSync(process.execPath, [
        '--import', resolve('node_modules/tsx/dist/loader.mjs'), resolve('scripts/content-change-validate.ts'),
      ], { cwd: root, encoding: 'utf8' });
      assert.equal(command.status, 1, 'default mode must fail on actual errors in an untracked article');
      assert.match(command.stderr, /Missing.*header|Missing hero/, 'failure must identify real content errors');
      git('add', 'src/content/legacy/blog/untracked.md');
      const changed = collectChangedMarkdown(command => execFileSync('/bin/sh', ['-c', command], {
        cwd: root, stdio: 'pipe',
      }).toString());
      assert(changed.includes('untracked.md'), 'staged additions remain in scope');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
