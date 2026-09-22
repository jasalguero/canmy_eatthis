const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the whole workspace so edits in packages/shared (etc.) are picked up.
config.watchFolders = [workspaceRoot];

// pnpm's node_modules is non-flat: most packages live only as a symlink under
// ../../node_modules/.pnpm/<hash>/node_modules/<pkg>, often nested inside another
// package's own node_modules (e.g. @expo/metro-runtime only exists inside
// expo-router's node_modules, not in apps/mobile's or the workspace root's
// node_modules). Metro's default resolver neither follows symlinks nor walks up
// through those nested node_modules folders unless told to. Do NOT restrict
// `nodeModulesPaths` or set `disableHierarchicalLookup` here — that combination is
// for de-duplicating a *hoisted* (npm/yarn) monorepo and actively breaks pnpm's
// structure, which relies on exactly the hierarchical, symlink-following lookup
// being enabled.
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// NativeWind v4 (docs/02-tech-decisions.md D4): compiles global.css with the
// project's tailwind.config.js (default palette removed — see that file).
module.exports = withNativeWind(config, { input: './global.css' });
