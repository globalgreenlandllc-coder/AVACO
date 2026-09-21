# AVOCO Platform

- backend-api/  — Your own API (deploy to Vercel). Your platform calls this with a permanent API key.
                  See backend-api/README.md for endpoints, environment variables and deploy steps.
- test-tool/    — Command-line test script that calls AVOCO directly from your Mac.
                  Useful for quickly checking a recording: npm install, create .env, npm run example -- file.m4a

Secrets are never stored in these files. Put them in Vercel Environment Variables
(or a local .env / .env.local file, which is ignored by Git).
