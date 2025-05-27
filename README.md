# TikTok Video Downloader

A modern web application for downloading TikTok videos without watermark. Built with Node.js, Express, and vanilla JavaScript.

## Features

- Clean and modern UI with dark theme
- Download TikTok videos without watermark
- Convert videos to MP3 format
- Video preview with thumbnail and information
- Progress tracking for downloads
- Responsive design for mobile devices

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- ffmpeg (for MP3 conversion)

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd tiktok-downloader
```

2. Install dependencies:
```bash
npm install
```

3. Install ffmpeg (if not already installed):

For Windows:
```bash
# Using chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

For macOS:
```bash
brew install ffmpeg
```

For Linux:
```bash
sudo apt update
sudo apt install ffmpeg
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Paste a TikTok video URL and click "Preview"
4. Choose your preferred format (MP4 or MP3)
5. Click "Download" to save the file

## Development

To run the server in development mode with auto-reload:
```bash
npm run dev
```

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 