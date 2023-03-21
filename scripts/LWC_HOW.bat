@ECHO OFF
CLS
echo *** Cloning LWC_HOW
CD C:\
IF EXIST C:\LWC_HOW (
    RMDIR /S /Q C:\LWC_HOW
) ELSE (
    REM ECHO NOTHING
)
call git clone https://github.com/eltoroit/LWC_HOW.git
cd C:\LWC_HOW
call git checkout LWC_HOW
echo *** Installing npm dependencies
call npm install
echo Opening VS Code
call code C:\LWC_HOW 
echo "VS Code Opened LWC project"
exit 0