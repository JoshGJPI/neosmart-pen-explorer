# Deployment Guide for NeoSmartpen Data Explorer

This guide walks through the process of deploying the application to GitHub Pages.

## Prerequisites

1. Make sure you have Node.js and npm installed
2. Ensure you have push access to the GitHub repository

## First-time Setup

1. Clone the repository (if you haven't already):
   ```bash
   git clone https://github.com/JoshGJPI/neosmart-pen-explorer.git
   cd neosmart-pen-explorer
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

## Deploying to GitHub Pages

The deployment process is simple, thanks to the `gh-pages` package:

1. Make sure all your changes are committed to the main branch:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. Run the deployment script:
   ```bash
   npm run deploy
   ```

This will:
- Build and prepare your site
- Create or update the `gh-pages` branch
- Push the content to GitHub
- Make it available at https://joshgjpi.github.io/neosmart-pen-explorer/

## How It Works

The deployment process:

1. The `gh-pages` package creates a temporary clone of the repository
2. It checks out the `gh-pages` branch (or creates it if it doesn't exist)
3. It copies all files from the specified directory (in this case, the root directory)
4. It commits the changes with a timestamp
5. It pushes the `gh-pages` branch to the remote repository

GitHub automatically publishes the content of the `gh-pages` branch to GitHub Pages.

## Troubleshooting

If you encounter issues:

1. **Authentication errors**: Make sure you have the right permissions to push to the repository
2. **Deployment fails**: Check if there are any large files that might be causing issues
3. **Page not updating**: GitHub Pages may take a few minutes to update after deployment

## Customizing Deployment

If needed, you can customize the deployment by modifying the `deploy` script in `package.json`.

Some common options:

- Change the output directory: `gh-pages -d dist`
- Add a CNAME file: `gh-pages -d . -t true -a CNAME`
- Use a different branch: `gh-pages -d . -b production`

See the [gh-pages documentation](https://github.com/tschaub/gh-pages) for more options.
