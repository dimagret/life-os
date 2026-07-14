param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [Parameter(Mandatory = $true)]
  [string]$Domain,

  [string]$AppName = "life-os",
  [string]$AppDir = "/var/www/life-os"
)

$ErrorActionPreference = "Stop"

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command,

    [Parameter(Mandatory = $true)]
    [string]$Description
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Description failed with exit code $LASTEXITCODE"
  }
}

if (-not (Test-Path -LiteralPath "package.json") -or -not (Test-Path -LiteralPath "deploy")) {
  throw "Run this script from the life-os project directory."
}

$archive = Join-Path $env:TEMP "$AppName-deploy.tar.gz"
if (Test-Path -LiteralPath $archive) {
  Remove-Item -LiteralPath $archive -Force
}

Write-Host "=== Deploying Life OS to $Server ==="
Write-Host "Domain: $Domain"
Write-Host "Remote app dir: $AppDir"

Write-Host "Step 1: Creating deploy archive..."
Invoke-Native -Description "Archive creation" -Command {
  tar `
    --exclude=node_modules `
    --exclude=.next `
    --exclude=dist `
    --exclude=out `
    --exclude=.git `
    --exclude=*.log `
    --exclude=.env `
    --exclude=.env.* `
    --exclude=.env.local `
    -czf $archive .
}

Write-Host "Step 2: Preparing clean remote directory..."
Invoke-Native -Description "Remote directory preparation" -Command {
  ssh $Server "sudo mkdir -p '$AppDir' && if [ -f '$AppDir/.env.local' ]; then sudo cp '$AppDir/.env.local' '/tmp/${AppName}.env.local'; fi && sudo find '$AppDir' -mindepth 1 -maxdepth 1 ! -name '.env.local' -exec rm -rf {} + && if [ -f '/tmp/${AppName}.env.local' ]; then sudo mv '/tmp/${AppName}.env.local' '$AppDir/.env.local'; fi && sudo chown -R `$(id -u):`$(id -g) '$AppDir'"
}

Write-Host "Step 3: Uploading archive..."
Invoke-Native -Description "Archive upload" -Command {
  scp $archive "${Server}:/tmp/${AppName}-deploy.tar.gz"
}

Write-Host "Step 4: Extracting and installing on VPS..."
Invoke-Native -Description "Remote install" -Command {
  ssh $Server "cd '$AppDir' && tar -xzf '/tmp/${AppName}-deploy.tar.gz' && rm -f '/tmp/${AppName}-deploy.tar.gz' && sudo bash deploy/install.sh '$Domain'"
}

Write-Host "Deployment command completed."
Write-Host "Site: https://$Domain"
Write-Host "Logs: ssh $Server 'sudo journalctl -u $AppName -f'"
