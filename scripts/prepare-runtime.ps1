$ErrorActionPreference='Stop'
$project=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtime=Join-Path $project '.runtime'
$pythonRoot=Join-Path $runtime 'python'
$site=Join-Path $project '.desktop-env\Lib\site-packages'
if (-not (Test-Path -LiteralPath $site)) { throw 'Run npm run desktop:setup first.' }
New-Item -ItemType Directory -Path $runtime,$pythonRoot -Force | Out-Null
$archive=Join-Path $runtime 'python-3.11.9-embed-amd64.zip'
if (-not (Test-Path -LiteralPath $archive)) { Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' -OutFile $archive }
Expand-Archive -LiteralPath $archive -DestinationPath $pythonRoot -Force
$targetSite=Join-Path $pythonRoot 'Lib\site-packages'
New-Item -ItemType Directory -Path $targetSite -Force | Out-Null
Copy-Item -Path (Join-Path $site '*') -Destination $targetSite -Recurse -Force
foreach ($dll in @('pywintypes311.dll','pythoncom311.dll')) { Copy-Item -LiteralPath (Join-Path $targetSite "pywin32_system32\$dll") -Destination $pythonRoot -Force }
$paths="python311.zip`n.`nLib/site-packages`nLib/site-packages/win32`nLib/site-packages/win32/lib`nLib/site-packages/Pythonwin`nimport site`n"
[System.IO.File]::WriteAllText((Join-Path $pythonRoot 'python311._pth'),$paths,(New-Object System.Text.UTF8Encoding($false)))
$snapshots=Join-Path $project '.things-local\models\models--Systran--faster-whisper-base\snapshots'
$snapshot=Get-ChildItem -LiteralPath $snapshots -Directory | Select-Object -First 1
if (-not $snapshot) { throw 'The public Whisper base model is missing. Run npm run desktop:setup first.' }
$model=Join-Path $runtime 'models\base'
New-Item -ItemType Directory -Path $model -Force | Out-Null
Copy-Item -Path (Join-Path $snapshot.FullName '*') -Destination $model -Recurse -Force
& (Join-Path $pythonRoot 'python.exe') -c "import win32gui, win32api, faster_whisper; print('Bundled Python imports passed')"
if ($LASTEXITCODE -ne 0) { throw 'Bundled Python import check failed' }
Write-Output 'Portable Python and local speech model prepared. No API key was copied.'
