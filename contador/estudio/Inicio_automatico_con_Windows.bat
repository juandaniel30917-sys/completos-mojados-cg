@echo off
rem Hace que el emisor parta solo cada vez que se enciende este PC (minimizado).
set "DEST=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Contador HyperDeck.bat"
(
  echo @echo off
  echo start "Contador HyperDeck" /min cmd /c ""%~dp0Contador_HyperDeck.bat""
) > "%DEST%"
echo Listo: el Contador HyperDeck partira solo al encender el PC.
echo Para quitarlo borra: %DEST%
pause
