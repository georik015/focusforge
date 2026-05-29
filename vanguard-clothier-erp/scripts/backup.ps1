# Vanguard ERP — резервное копирование базы данных
# Запуск: powershell -File scripts/backup.ps1
# Через Task Scheduler: ежедневно в 03:00

$projectRoot = Split-Path -Parent $PSScriptRoot
$backupDir   = Join-Path $projectRoot "backups"
$dbPath      = Join-Path $projectRoot "prisma\dev.db"
$date        = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupPath  = Join-Path $backupDir "dev_$date.db"

if (-not (Test-Path $dbPath)) {
    Write-Error "База данных не найдена: $dbPath"
    exit 1
}

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

Copy-Item -Path $dbPath -Destination $backupPath -Force
Write-Output "Backup saved: $backupPath"

# Оставляем только последние 30 резервных копий
$files = Get-ChildItem -Path $backupDir -Filter "dev_*.db" | Sort-Object LastWriteTime -Descending
if ($files.Count -gt 30) {
    $toDelete = $files | Select-Object -Skip 30
    $toDelete | Remove-Item -Force
    Write-Output "Удалено старых бэкапов: $($toDelete.Count)"
}
