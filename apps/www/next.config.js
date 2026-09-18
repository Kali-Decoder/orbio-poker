await import('./src/env.js');

/**
 * @param {boolean} isServer
 * @param {{ experiments: any; module: { rules: { test: RegExp; type: string; }[]; }; output: { webassemblyModuleFilename: string; }; resolve: { fallback?: Record<string, boolean>; alias?: Record<string, unknown> }; externals: any }} config
 */
function patchWasmModuleImport(isServer, config) {
  config.experiments = Object.assign(config.experiments || {}, {
    asyncWebAssembly: true,
  });

  config.module.rules.push({
    test: /\.wasm$/,
    type: 'webassembly/async',
  });

  if (isServer) {
    config.output.webassemblyModuleFilename =
      './../static/wasm/[modulehash].wasm';
  } else {
    config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';
  }
}

/** @type {import("next").NextConfig} */
const config = {
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Privy optional peers — unused in this Ethereum wallet app
    const optionalPeers = [
      '@solana/kit',
      '@solana-program/memo',
      '@solana-program/system',
      '@solana-program/token',
      '@farcaster/mini-app-solana',
      '@abstract-foundation/agw-client',
      'permissionless',
    ];
    for (const pkg of optionalPeers) {
      config.externals[pkg] = `commonjs ${pkg}`;
    }

    // Stub Farcaster mini-app Solana (Privy lazy-imports; we never use it)
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@farcaster/mini-app-solana': false,
    };

    config.resolve.fallback = { fs: false, path: false, util: false };
    patchWasmModuleImport(isServer, config);

    return config;
  },
};

export default config;
