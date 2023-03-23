@REM REM *** Must Go In The Image ***
@REM REM Place this file in the C:\TH folder which is the folder for testing the images.
@REM REM This file will be opened indirectly when tester types t <ENTER> 

@REM @ECHO OFF
@REM CLS
@REM ECHO Application Tester built by Andres Perez (ELTORO.IT)
@REM ECHO Please wait while we download the latest scripts
@REM CD C:\TH
@REM IF EXIST PCTesterScript (
@REM 	REM ECHO DELETING
@REM 	RMDIR /S /Q PCTesterScript
@REM ) ELSE (
@REM 	REM ECHO NOTHING
@REM )
@REM git clone https://github.com/eltoroit/PCTesterScript.git
@REM CD PCTesterScript
@REM node src/tester.js &