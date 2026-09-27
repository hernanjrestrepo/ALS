#!/usr/bin/env bash
# Build the ALS client and publish it to the nginx-served static root.
# Run this after every `git pull` that touches client/.
set -euo pipefail

cd /home/ubuntu/serambienteai/client
source ~/.nvm/nvm.sh
nvm use 20

npm run build

sudo rsync -a --delete dist/ /var/www/als-frontend/
sudo chown -R www-data:www-data /var/www/als-frontend
sudo find /var/www/als-frontend -type d -exec chmod 755 {} \;
sudo find /var/www/als-frontend -type f -exec chmod 644 {} \;

echo "Deployed. Site: https://als.paradixe.xyz/"
