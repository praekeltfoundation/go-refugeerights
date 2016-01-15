#!/bin/bash
#
# Regenerate .pot translation files from the application source code.

APP=("go-app-sms.js" "go-app-ussd.js")

for app in $APP
do
    APP_BASE=`basename "$app" .js`
    jspot extract -k '$' "$app" -t "translations/$APP_BASE"
done
