import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { unlinkSync } from 'node:fs'

const output = 'test/.auth-reminder.mjs'
try {
  await build({
    entryPoints: ['test/auth-reminder.test.jsx'], outfile: output, bundle: true,
    platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic',
    plugins: [{
      name: 'mock-cloud-dependencies',
      setup(build) {
        build.onResolve({ filter: /(?:(?:^|\/)supabase\.js|\/App\.jsx)$/ }, args => ({ path: args.path, namespace: 'mock' }))
        build.onLoad({ filter: /supabase\.js$/, namespace: 'mock' }, () => ({ contents: `
          export const normalizeName = (n) => String(n || '').normalize('NFKC').trim().replace(/\\s+/g, ' ').toLowerCase();
          export const loginEmail = async () => 'user@example.invalid';
          export const supabase = { auth: {
            getSession: async () => ({data:{session:null}}),
            onAuthStateChange: callback => { globalThis.__authMock.onChange = callback; return {data:{subscription:{unsubscribe(){}}}} },
            signUp: (...args) => globalThis.__authMock.signUp(...args),
            signInWithPassword: (...args) => globalThis.__authMock.signIn(...args), signOut: async () => {},
          }, from: () => ({select: () => ({eq: () => ({maybeSingle: () => new Promise(() => {})})})}) };
        ` }))
        build.onLoad({ filter: /App\.jsx$/, namespace: 'mock' }, () => ({ contents: 'export default function App() { return null }' }))
      },
    }],
  })
  const result = spawnSync(process.execPath, ['--import', './test/auth-env.js', '--test', output], { stdio: 'inherit' })
  process.exitCode = result.status ?? 1
} finally {
  try { unlinkSync(output) } catch { /* build failed before writing */ }
}
