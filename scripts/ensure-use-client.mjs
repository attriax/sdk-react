import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directive = '"use client";\n';
const outputFiles = ['dist/index.js', 'dist/index.cjs'];

try {
  for (const relativePath of outputFiles) {
    const filePath = resolve(process.cwd(), relativePath);
    const content = await readFile(filePath, 'utf8');

    if (!content.startsWith(directive)) {
      await writeFile(filePath, `${directive}${content}`);
    }
  }

  process.stdout.write('Injected "use client" into sdk-react dist entrypoints.\n');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to inject \"use client\" into sdk-react dist output: ${message}\n`);
  process.exit(1);
}