const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Resolve @clstr/core to local packages/core/src
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@clstr/core": path.resolve(__dirname, "packages/core/src"),
};

// Watch the packages directory for changes
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, "packages"),
];

module.exports = config;
