# Thiết lập biến môi trường cho Backend hệ thống giám sát điện năng
$env:MQTT_HOST = "localhost"
$env:MQTT_PORT = "1883"
$env:MQTT_USER = "backend"
$env:MQTT_PASS = "matkhau_backend"
$env:JWT_SECRET = "0lrmkTwguZPItMogNbMYktAlpFDfrX0KDcbv_bBwgUdW111QDifFzL80vH3Y_BRo"
$env:DEVICE_ID = "esp32-01"
$env:TZ_OFFSET_H = "7"
$env:ALLOWED_ORIGINS = "*"

Write-Host "✅ Đã nạp thành công biến môi trường cho Backend!" -ForegroundColor Green

