#!/bin/sh
# Applies pending migrations and upserts the reference catalogue before the
# API starts. Fixtures are synthetic and are never loaded here; run
# `npm run db:seed:fixtures` by hand in development.
set -e

npm run db:migrate
npm run db:seed:reference

exec "$@"
