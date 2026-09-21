// No-op replacement for the `server-only` package when running tests outside
// of the Next.js server runtime (vitest). Importing lib modules that call
// `import "server-only"` is safe in tests because we never bundle them for
// the browser here.
export {};
