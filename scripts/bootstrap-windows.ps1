[CmdletBinding()]
param(
  [string]$RepoUrl = "https://github.com/Vincentssssssss/TravelAgent.git",
  [string]$TargetRef = "cursor/travel-assistant-mvp-9bc6",
  [string]$WorkDir = "$HOME\Projects",
  [string]$RepoName = "TravelAgent",
  [string]$QwenApiBaseUrl = "https://llm-sx2qy7imh5bxbc2o.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  [string]$QwenModel = "qwen-plus",
  [string]$QwenEmbeddingModel = "qwen3.7-text-embedding",
  [ValidateSet("remote", "auto", "local")]
  [string]$LlmMode = "auto",
  [ValidateSet("remote", "auto", "local")]
  [string]$EmbeddingMode = "auto",
  [string]$QwenApiKey = "",
  [string]$AdminKey = "123456789",
  [switch]$InstallPoppler,
  [switch]$RunBuildAndTests,
  [switch]$StartDev
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing command '$Name'. Please install it first."
  }
}

function Set-OrAppendEnvValue {
  param(
    [string]$Path,
    [string]$Key,
    [string]$Value
  )

  $line = "$Key=$Value"
  $escapedKey = [Regex]::Escape($Key)
  $pattern = "(?m)^$escapedKey=.*$"
  $content = ""
  if (Test-Path $Path) {
    $content = Get-Content $Path -Raw
  }

  if ($content -match $pattern) {
    $content = [Regex]::Replace($content, $pattern, $line)
  } else {
    if ($content -and -not $content.EndsWith("`n")) {
      $content += "`r`n"
    }
    $content += "$line`r`n"
  }

  Set-Content -Path $Path -Value $content -Encoding UTF8
}

function Resolve-CheckoutRef {
  param([string]$RefName)

  $tag = (git tag -l $RefName | Out-String).Trim()
  if ($tag) {
    git checkout $RefName
    return
  }

  $localBranch = (git branch --list $RefName | Out-String).Trim()
  if ($localBranch) {
    git checkout $RefName
    git pull origin $RefName
    return
  }

  $remoteBranch = (git branch -r --list "origin/$RefName" | Out-String).Trim()
  if ($remoteBranch) {
    git checkout -B $RefName "origin/$RefName"
    return
  }

  throw "Cannot find ref '$RefName' in tags/local/remote branches."
}

Write-Host "==> Checking required tools..."
Require-Command "git"
Require-Command "node"
Require-Command "npm"

Write-Host "==> Node version: $(node -v)"
Write-Host "==> npm version:  $(npm -v)"

if (-not (Test-Path $WorkDir)) {
  New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
}

$repoPath = Join-Path $WorkDir $RepoName
if (-not (Test-Path $repoPath)) {
  Write-Host "==> Cloning repository..."
  git clone $RepoUrl $repoPath
} else {
  Write-Host "==> Repository already exists, reusing: $repoPath"
}

Set-Location $repoPath

Write-Host "==> Fetching latest branches and tags..."
git fetch origin --prune --tags

Write-Host "==> Checking out target ref: $TargetRef"
Resolve-CheckoutRef -RefName $TargetRef

Write-Host "==> Installing dependencies..."
npm install

$envPath = Join-Path $repoPath ".env"
if (-not (Test-Path $envPath)) {
  Copy-Item ".env.example" ".env" -Force
}

Write-Host "==> Writing .env configuration..."
Set-OrAppendEnvValue -Path $envPath -Key "QWEN_API_BASE_URL" -Value $QwenApiBaseUrl
Set-OrAppendEnvValue -Path $envPath -Key "QWEN_MODEL" -Value $QwenModel
Set-OrAppendEnvValue -Path $envPath -Key "LLM_MODE" -Value $LlmMode
Set-OrAppendEnvValue -Path $envPath -Key "QWEN_EMBEDDING_MODEL" -Value $QwenEmbeddingModel
Set-OrAppendEnvValue -Path $envPath -Key "EMBEDDING_MODE" -Value $EmbeddingMode
Set-OrAppendEnvValue -Path $envPath -Key "ADMIN_KEY" -Value $AdminKey
Set-OrAppendEnvValue -Path $envPath -Key "ENABLE_OCR" -Value "false"
if ($QwenApiKey) {
  Set-OrAppendEnvValue -Path $envPath -Key "QWEN_API_KEY" -Value $QwenApiKey
}

if ($InstallPoppler) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "==> Installing Poppler (pdftotext fallback)..."
    winget install oschwartz10612.poppler --accept-package-agreements --accept-source-agreements -e
  } else {
    Write-Warning "winget not found. Install poppler manually if needed."
  }
}

if ($RunBuildAndTests) {
  Write-Host "==> Running build..."
  npm run build
  Write-Host "==> Running tests..."
  npm run test
}

Write-Host ""
Write-Host "==> Setup complete."
Write-Host "Project path: $repoPath"
Write-Host "User URL:     http://localhost:3000"
Write-Host "Admin URL:    http://localhost:3000/admin?key=$AdminKey"

if ($StartDev) {
  Write-Host "==> Starting dev server..."
  npm run dev
} else {
  Write-Host "Run 'npm run dev' when you are ready."
}
