const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Explicitly set projectRoot so Metro always resolves the entry from apps/mobile
config.projectRoot = projectRoot;

// 1. Watch all files within the monorepo (for shared packages)
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');

config.resolver.nodeModulesPaths = [
  mobileNodeModules,
  rootNodeModules,
];

// 3. Force single copies of critical packages.
//    Resolve each package to wherever it actually exists (local or hoisted).
//    This prevents the root node_modules react@19.2.4 from being picked up
//    when bundling shared packages, which causes "Invalid hook call" errors.
const singletonPackages = [
  'react',
  'react-native',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
];

// Helper: find the actual installed location of a package (local first, then root)
function findPackageDir(pkg) {
  const localPath = path.resolve(mobileNodeModules, pkg);
  if (fs.existsSync(localPath)) return localPath;
  const rootPath = path.resolve(rootNodeModules, pkg);
  if (fs.existsSync(rootPath)) return rootPath;
  return localPath; // fallback to local (will error clearly if missing)
}

// Resolve the canonical directory for each singleton
const singletonDirs = {};
config.resolver.extraNodeModules = {};
for (const pkg of singletonPackages) {
  const resolved = findPackageDir(pkg);
  config.resolver.extraNodeModules[pkg] = resolved;
  singletonDirs[pkg] = resolved;
}

// 3b. Custom resolveRequest to guarantee singleton React even when Metro
//     finds the root node_modules copy via hierarchical lookup from shared packages.
const canonicalReactDir = singletonDirs['react'] + path.sep;
const canonicalRNDir = singletonDirs['react-native'] + path.sep;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Let the default resolver do its work first
  const defaultResolve = (ctx, name, plat) =>
    ctx.resolveRequest({ ...ctx, resolveRequest: undefined }, name, plat);

  const result = defaultResolve(context, moduleName, platform);

  // If the result points to a NON-canonical copy of react or react-native,
  // redirect to the canonical copy so only one instance is bundled.
  if (result && result.type === 'sourceFile' && result.filePath) {
    const fp = result.filePath;

    // Check all node_modules locations for react
    if (fp.includes(path.sep + 'react' + path.sep) && !fp.startsWith(canonicalReactDir)) {
      // Extract the relative path within the react package
      const reactIdx = fp.indexOf(path.sep + 'react' + path.sep);
      const relative = fp.slice(reactIdx + path.sep.length + 'react'.length + path.sep.length);
      const redirected = path.join(singletonDirs['react'], relative);
      if (fs.existsSync(redirected)) {
        return { type: 'sourceFile', filePath: redirected };
      }
    }

    // Check all node_modules locations for react-native
    if (fp.includes(path.sep + 'react-native' + path.sep) && !fp.startsWith(canonicalRNDir)) {
      const rnIdx = fp.indexOf(path.sep + 'react-native' + path.sep);
      const relative = fp.slice(rnIdx + path.sep.length + 'react-native'.length + path.sep.length);
      const redirected = path.join(singletonDirs['react-native'], relative);
      if (fs.existsSync(redirected)) {
        return { type: 'sourceFile', filePath: redirected };
      }
    }
  }
  return result;
};

// 4. Keep hierarchical lookup enabled for Expo SDK 54 default behavior
config.resolver.disableHierarchicalLookup = false;

// 5. Block sibling apps and unrelated root dirs from being bundled
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sep = path.sep === '\\' ? '\\\\' : '/';

const blockList = [
  new RegExp(`${escapeRegExp(path.resolve(monorepoRoot, 'apps', 'web'))}${sep}.*`),
  new RegExp(`${escapeRegExp(path.resolve(monorepoRoot, 'external'))}${sep}.*`),
  new RegExp(`${escapeRegExp(path.resolve(monorepoRoot, 'src'))}${sep}.*`),
];

// Remove __tests__ from the default blockList so DevTestOverlay can import testHarness
if (Array.isArray(config.resolver.blockList)) {
  const filtered = config.resolver.blockList.filter(
    (re) => !re.source.includes('__tests__')
  );
  config.resolver.blockList = [...filtered, ...blockList];
} else {
  config.resolver.blockList = blockList;
}

module.exports = config;
