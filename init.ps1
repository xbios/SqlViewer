param(
  [ValidateSet("install", "start", "pack", "dist", "dist-win")]
  [string]$Task = "install",

  [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-CommandExists {
  param([string]$Name)

  $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Step {
  param(
    [string]$Title,
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Title"
  & $Action
}

Set-Location $PSScriptRoot

if (-not (Test-CommandExists "node")) {
  throw "Node.js bulunamadi. Once Node.js LTS kurulumunu yapin: https://nodejs.org/"
}

if (-not (Test-CommandExists "npm")) {
  throw "npm bulunamadi. Node.js kurulumu ile birlikte gelmelidir."
}

Write-Host "SQL Viewer Desktop init"
Write-Host "Node: $(node --version)"
Write-Host "npm : $(npm --version)"

if (-not $SkipInstall) {
  if (Test-Path "package-lock.json") {
    Invoke-Step "Bagimliliklar kuruluyor (npm ci)" {
      npm ci
    }
  } else {
    Invoke-Step "Bagimliliklar kuruluyor (npm install)" {
      npm install
    }
  }
}

switch ($Task) {
  "install" {
    Write-Host ""
    Write-Host "Hazir. Uygulamayi baslatmak icin:"
    Write-Host "  .\init.ps1 -Task start -SkipInstall"
  }
  "start" {
    Invoke-Step "Uygulama baslatiliyor" {
      npm start
    }
  }
  "pack" {
    Invoke-Step "Klasor paketi uretiliyor" {
      npm run pack
    }
  }
  "dist" {
    Invoke-Step "Dagitim paketi uretiliyor" {
      npm run dist
    }
  }
  "dist-win" {
    Invoke-Step "Windows installer uretiliyor" {
      npm run dist:win
    }
  }
}
