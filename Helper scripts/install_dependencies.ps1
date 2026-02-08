# Voice Assistant Setup Script
# Installs all required dependencies

Write-Host "🚀 Voice Assistant Setup" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Copy config.example.py to config.py" -ForegroundColor White
Write-Host "2. Get Picovoice key: https://console.picovoice.ai/" -ForegroundColor White
Write-Host "3. Edit config.py and add your API key" -ForegroundColor White
Write-Host "4. Start LM Studio" -ForegroundColor White
Write-Host "5. Run: python main.py" -ForegroundColor White
Write-Host ""
