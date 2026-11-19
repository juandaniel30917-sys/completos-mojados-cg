@echo off
chcp 65001 >nul
title Contador HyperDeck - Emisor
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY python --version >nul 2>&1 && set "PY=python"
if not defined PY (
  echo Python no esta instalado. Instalando Python 3.12 con winget, espera...
  winget install -e --id Python.Python.3.12 --scope user --accept-source-agreements --accept-package-agreements
  if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "PY="%LocalAppData%\Programs\Python\Python312\python.exe""
)
if not defined PY (
  echo No se pudo instalar Python. Descargalo de https://www.python.org/downloads/ y vuelve a abrir este acceso.
  pause
  exit /b 1
)
%PY% server.py --abrir
pause
