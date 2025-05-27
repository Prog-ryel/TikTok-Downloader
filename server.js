const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve any static file from public directory
app.get('*.*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', req.path));
});

// Proxy endpoint for video streaming
app.get('/proxy/video', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.tiktok.com/'
        };

        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers
        });

        // Forward the content type
        res.setHeader('Content-Type', response.headers['content-type']);
        
        // Pipe the video stream
        response.data.pipe(res);
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({ error: 'Failed to proxy video' });
    }
});

app.post('/api/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.tiktok.com/'
        };

        const response = await axios.get(`https://www.tikwm.com/api/?url=${url}`, { headers });
        
        // Modify the response to use our proxy for video playback
        if (response.data.data && response.data.data.play) {
            const originalUrl = response.data.data.play;
            response.data.data.play = `/proxy/video?url=${encodeURIComponent(originalUrl)}`;
        }
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/download', async (req, res) => {
    try {
        const { url, format } = req.body;
        const timestamp = Date.now();
        const videoPath = path.join(downloadsDir, `tiktok_${timestamp}.mp4`);
        const audioPath = path.join(downloadsDir, `tiktok_${timestamp}.mp3`);

        // Get video info
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.tiktok.com/'
        };

        const response = await axios.get(`https://www.tikwm.com/api/?url=${url}`, { headers });
        const videoUrl = response.data.data.play;

        // Download video
        const videoResponse = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            headers
        });

        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(videoPath);
            videoResponse.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        if (format === 'mp3') {
            // Convert to MP3
            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .toFormat('mp3')
                    .on('end', () => {
                        fs.unlinkSync(videoPath); // Delete the video file
                        resolve();
                    })
                    .on('error', reject)
                    .save(audioPath);
            });

            res.json({
                success: true,
                file: `/downloads/tiktok_${timestamp}.mp3`
            });
        } else {
            res.json({
                success: true,
                file: `/downloads/tiktok_${timestamp}.mp4`
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cleanup old files every hour
setInterval(() => {
    try {
        const files = fs.readdirSync(downloadsDir);
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(downloadsDir, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > 3600000) { // 1 hour
                fs.unlinkSync(filePath);
            }
        });
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}, 3600000);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 