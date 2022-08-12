@ECHO OFF
CLS
CD C:\
IF EXIST C:\LWC_HOW (
	RMDIR /S /Q C:\LWC_HOW
) ELSE (
	REM ECHO NOTHING
)
git clone https://github.com/eltoroit/LWC_HOW.git
cd C:\LWC_HOW
git checkout LWC_HOW
npm install