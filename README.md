# Khila's World

Khila's mobile-ready personal hub for music, style, beauty, sports, study, weather, and an AI-powered public-artist information guide.

## Local setup

1. Copy `.env.example` to `.env` or edit the existing private `.env` file.
2. Add `OPENAI_API_KEY`.
3. Run `npm start`.
4. Open `http://localhost:8787`.

## Deployment

This project includes `render.yaml` for deployment from GitHub to Render. Add `OPENAI_API_KEY` as a secret environment variable in Render; never commit `.env`.
