$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is required but was not found on PATH."
}

docker compose version | Out-Null
docker compose up --build -d

$runningServices = docker compose ps --status running --services
if ($runningServices -notcontains "app") {
    docker compose ps
    docker compose down
    Write-Error "Application container is not running."
}

$port = if ($env:APP_PORT) { $env:APP_PORT } else { "8000" }
Write-Host "Application URL: http://localhost:$port"
