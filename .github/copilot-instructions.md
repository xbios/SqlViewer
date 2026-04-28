---
name: copilot-instructions
---

# SQL Viewer Desktop Workspace Instructions

## What this project is

This repository is a small Electron desktop application for browsing `.sql` files in a selected folder.

Key points:
- Electron app entry: `main.js`
- Renderer UI: `index.html`, `renderer.js`, `styles.css`
- Preload script: `preload.js`
- App package metadata: `package.json`
- Build outputs go to `dist/`

## How to run locally

Use the existing project scripts in `package.json`:
- `npm install` to install dependencies
- `npm start` to run the app in development

There is also `init.ps1` for Windows setup and startup, including an option to skip install.

## How to build packages

Use the Electron builder commands defined in `package.json`:
- `npm run dist:win` for Windows installers
- `npm run dist:mac` for macOS packages
- `npm run dist` for all configured targets

> Note: Windows builds should be produced on Windows; macOS builds generally require a macOS environment.

## Project conventions

- Keep desktop app logic in `main.js`
- Keep UI and page behavior in `renderer.js`
- Keep styling in `styles.css`
- Do not modify `package.json` scripts or `build.files` unless adding files that must be packaged into the app

## When you should use these instructions

Use this guidance when you need to:
- understand repository structure and Electron app boundaries
- add or update app features in the renderer or main process
- update build/package settings for Electron builder
- fix startup, packaging, or dependency issues

## Useful references

- `README.md` for run/build commands and Windows init guidance
- `package.json` for Electron scripts and build configuration
