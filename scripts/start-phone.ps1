$ErrorActionPreference = "Stop"

$ip = $null
$currentIPv4 = $null

foreach ($line in (ipconfig)) {
  if ($line -match "IPv4 Address.*:\s*([0-9.]+)") {
    $currentIPv4 = $Matches[1]
  }

  if ($line -match "Default Gateway.*:\s*([0-9.]+)" -and $currentIPv4) {
    $ip = $currentIPv4
    break
  }
}

if (-not $ip) {
  throw "Could not find this computer's Wi-Fi IP address. Connect this computer to Wi-Fi and try again."
}

Write-Host "Starting Expo for phone scanning on $ip`:8081" -ForegroundColor Cyan
Write-Host "Make sure your phone is on the same Wi-Fi network." -ForegroundColor Cyan

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
npx expo start --lan --clear
