Set-Location $PSScriptRoot
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"
$env:npm_config_user_agent = "npm/10.0.0 node/v22.19.0"
npx expo start --dev-client --port 8081
