const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Explicitly set projectRoot so Metro always resolves the entry from apps/mobile
config.projectRoot = projectRoot;

// 1. Watch all files within the monorepo (for shared packages)
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force single copies of critical packages from apps/mobile/node_modules
//    This prevents the root node_modules react@19.2.4 from being picked up
//    when bundling shared packages, which causes "Invalid hook call" errors.
const singletonPackages = [
  'react',
  'react-native',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
];
config.resolver.extraNodeModules = {};
for (const pkg of singletonPackages) {
  config.resolver.extraNodeModules[pkg] = path.resolve(projectRoot, 'node_modules', pkg);
}

// 3b. Custom resolveRequest to guarantee singleton React even when Metro
//     finds the root node_modules copy via hierarchical lookup from shared packages.
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Let the default resolver do its work first
  const defaultResolve = (ctx, name, plat) =>
    ctx.resolveRequest({ ...ctx, resolveRequest: undefined }, name, plat);

  const result = defaultResolve(context, moduleName, platform);

  // If the result points to the root node_modules copy of react or react-native,
  // redirect to the mobile copy so only one instance is bundled.
  if (result && result.type === 'sourceFile' && result.filePath) {
    const fp = result.filePath;
    const rootReactDir = path.join(rootNodeModules, 'react') + path.sep;
    const rootRNDir = path.join(rootNodeModules, 'react-native') + path.sep;

    if (fp.startsWith(rootReactDir)) {
      const relative = fp.slice(rootReactDir.length);
      return { type: 'sourceFile', filePath: path.join(mobileNodeModules, 'react', relative) };
    }
    if (fp.startsWith(rootRNDir)) {
      const relative = fp.slice(rootRNDir.length);
      return { type: 'sourceFile', filePath: path.join(mobileNodeModules, 'react-native', relative) };
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
