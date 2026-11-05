import ts from 'typescript';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// Compile against the actual app models without adding a runtime dependency.
// Each invocation owns its temporary output, which is removed after completion.
await mkdir('.local', { recursive: true });
const directory = await mkdtemp(resolve('.local/database-tools-'));
try {
  const program = ts.createProgram(['scripts/database-tools.ts'], {
    outDir: directory, rootDir: '.', module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020, esModuleInterop: true, skipLibCheck: true,
    strict: true, noEmitOnError: true,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: name => name, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
    }));
    process.exitCode = 1;
  } else {
    program.emit();
    const result = spawnSync(process.execPath, [resolve(directory, 'scripts/database-tools.js'), ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
    process.exitCode = result.status ?? 1;
  }
} finally { await rm(directory, { recursive: true, force: true }); }
