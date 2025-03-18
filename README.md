# NeoSmartpen Data Explorer

A web application to explore and backup data from NeoSmartpen devices without erasing it from the pen.

[![Screenshot](./screenshots/app-screenshot.png)](https://joshgjpi.github.io/neosmart-pen-explorer/)

## 🚀 [Try It Now](https://joshgjpi.github.io/neosmart-pen-explorer/)

## Features

- **Connect** to your NeoSmartpen via Bluetooth
- **Browse** notes and pages stored on your pen
- **View** pen strokes visually or as raw data
- **Download** individual pages or backup all data
- **Preserve** your pen data - nothing is erased or modified

## Requirements

- A browser that supports the Web Bluetooth API (Chrome, Edge)
- A NeoSmartpen device (N2, M1+, etc.)
- Bluetooth capability on your computer

## How to Use

1. Visit the [live application](https://joshgjpi.github.io/neosmart-pen-explorer/)
2. Click "Connect Pen" and select your NeoSmartpen device
3. Browse the notes and pages stored on your pen
4. View data as raw JSON or visual stroke representation
5. Download data for backup or analysis

## Why Use This?

The NeoSmartpen app syncs your pen data to its servers and typically removes data from the pen after syncing. This application lets you:

- Create backups before syncing with the official app
- Explore the data format for development purposes
- Archive your pen data in raw JSON format
- View pen content without erasing it

## Technical Details

This application uses:
- Web Bluetooth API for pen communication
- Fabric.js for stroke visualization
- GitHub Pages for hosting
- Pure JavaScript, HTML, and CSS (no frameworks)

## Local Development

To run this application locally:

```bash
# Clone the repository
git clone https://github.com/JoshGJPI/neosmart-pen-explorer.git

# Navigate to the directory
cd neosmart-pen-explorer

# Install dependencies
npm install

# Start local development server
npm start
```

Then open your browser to http://localhost:8080

## Deployment

To deploy to GitHub Pages:

```bash
# Make sure you have all the dependencies installed
npm install

# Deploy to GitHub Pages
npm run deploy
```

This will deploy the content to the gh-pages branch and make it available at your GitHub Pages URL (e.g., https://username.github.io/neosmart-pen-explorer/).

## Privacy

This application:
- Runs entirely in your browser
- Does not send any data to any servers
- Does not modify data on your pen
- Does not require internet access after loading

## License

MIT License

## Disclaimer

This project is not affiliated with NeoLab Convergence Inc. NeoSmartpen is a trademark of NeoLab Convergence Inc.
