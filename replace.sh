#!/bin/sh
sed -ie "s/=\"\/static/=\"\.\/static/g" www/index.html
sed -ie "s/url(\/static/url(\.\./g" www/static/css/*.css
rm www/precache*
