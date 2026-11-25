import { createHash } from 'node:crypto';
import { access, readFile, rename, writeFile } from 'node:fs/promises';

// Reassemble the original long audio tracks from the GitHub upload parts.
export async function restoreAudioAssets() {
  const manifest = JSON.parse(await readFile(new URL('./assets/manifest.json', import.meta.url), 'utf8'));
  for (const [name, { parts, sha256 }] of Object.entries(manifest)) {
    const output = new URL('../' + name, import.meta.url);
    if (await access(output).then(() => true, () => false)) continue;
    const data = Buffer.concat(await Promise.all(parts.map(part => readFile(new URL('./assets/' + part, import.meta.url)))));
    if (createHash('sha256').update(data).digest('hex') !== sha256) {
      throw new Error('Invalid audio parts for ' + name);
    }
    const tmp = new URL(output.href + '.' + process.pid + '.tmp');
    await writeFile(tmp, data);
    await rename(tmp, output);
  }
}
