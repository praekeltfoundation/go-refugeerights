#!/bin/bash
#
# Regenerate all JSON translation files from .po files supplied by
# translators.

APP=("go-app-sms.js" "go-app-ussd.js")

for app in $APP
do
    APP_BASE=`basename "$app" .js`
    jspot json -t "translations/$APP_BASE" "translations/$APP_BASE"/*.po
done
