# Script khởi động toàn bộ dịch vụ backend hệ thống giám sát điện năng
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 1. Nạp biến môi trường
if (Test-Path ".\set_env.ps1") {
    . .\set_env.ps1
} else {
    Write-Warning "Không tìm thấy set_env.ps1!"
}

# Xác định đường dẫn Python trong .venv
$PythonExe = Join-Path $ScriptDir ".venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "KHỞI ĐỘNG CÁC DỊCH VỤ HỆ THỐNG GIÁM SÁT ĐIỆN NĂNG (KLTN)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 2. Kiểm tra Mosquitto Broker
$mosqProc = Get-Process mosquitto -ErrorAction SilentlyContinue
$mosqSvc = Get-Service mosquitto -ErrorAction SilentlyContinue

if ($mosqProc -or ($mosqSvc -and $mosqSvc.Status -eq 'Running')) {
    Write-Host "✅ Mosquitto Broker đang chạy." -ForegroundColor Green
} else {
    Write-Host "🔄 Đang khởi động Mosquitto Broker..." -ForegroundColor Yellow
    $MosqConf = "D:/Study/KLTN/App/energy-system/mosquitto/mosquitto.conf"
    $MosqCmd = Get-Command mosquitto.exe -ErrorAction SilentlyContinue
    $MosqBin = if ($MosqCmd) { $MosqCmd.Source } elseif (Test-Path "D:\Program Files\Mosquitto\mosquitto.exe") { "D:\Program Files\Mosquitto\mosquitto.exe" } else { "C:\Program Files\mosquitto\mosquitto.exe" }
    if (Test-Path $MosqBin) {
        Start-Process -FilePath $MosqBin -ArgumentList "-c `"$MosqConf`" -v" -WindowStyle Minimized
    } else {
        Write-Warning "Không tìm thấy Mosquitto tại $MosqBin. Nếu đã chạy dạng service hoặc vị trí khác, có thể bỏ qua."
    }
}

# 3. Khởi chạy Ingest Pipeline (cửa sổ riêng)
Write-Host "🚀 Đang mở cửa sổ Ingest Pipeline..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ScriptDir'; . .\set_env.ps1; Write-Host '--- INGEST PIPELINE ---' -ForegroundColor Green; & '$PythonExe' ingest.py" -WindowStyle Normal

# 4. Khởi chạy Scheduler (cửa sổ riêng)
Write-Host "⏰ Đang mở cửa sổ Scheduler..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ScriptDir'; . .\set_env.ps1; Write-Host '--- SCHEDULER & ANOMALY DETECTION ---' -ForegroundColor Cyan; & '$PythonExe' scheduler.py" -WindowStyle Normal

# 5. Khởi chạy FastAPI Web Service (cửa sổ riêng)
Write-Host "🌐 Đang mở cửa sổ FastAPI Server (cổng 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ScriptDir'; . .\set_env.ps1; Write-Host '--- FASTAPI REST & WEBSOCKET ---' -ForegroundColor Magenta; & '$PythonExe' -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✅ Toàn bộ 3 tiến trình đã được khởi chạy thành công!" -ForegroundColor Green
Write-Host "   - API Swagger UI: http://localhost:8000/docs" -ForegroundColor White
Write-Host "   - API Health:     http://localhost:8000/health" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green

