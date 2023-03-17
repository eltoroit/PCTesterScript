#!/bin/zsh

git add .
git commit -m "TEST"
find . -name .DS_Store -print0 | xargs -0 git rm -f --ignore-unmatch
git push origin master
