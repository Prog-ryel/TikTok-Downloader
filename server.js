const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Video info endpoint
app.post('/api/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.tiktok.com/'
        };

        const apiResponse = await axios.get(`https://www.tikwm.com/api/?url=${url}`, { headers });
        
        // Check if the API response is valid
        if (apiResponse.data.code !== 0) {
            throw new Error(apiResponse.data.msg || 'Failed to fetch video');
        }

        res.json(apiResponse.data);
    } catch (error) {
        console.error('Video info error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch video information',
            details: error.message 
        });
    }
});

// Download endpoint
app.post('/api/download', async (req, res) => {
    try {
        const { url, format } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.tiktok.com/'
        };

        // For MP3, use a different API endpoint
        if (format === 'mp3') {
            const apiResponse = await axios.get(`https://www.tikwm.com/api/?url=${url}&hd=1&music=1`, { headers });
            
            if (apiResponse.data.code !== 0 || !apiResponse.data.data) {
                throw new Error('Failed to get audio information');
            }

            const musicUrl = apiResponse.data.data.music_info.play;
            if (!musicUrl) {
                throw new Error('No audio available for this video');
            }

            const audioResponse = await axios.get(musicUrl, {
                responseType: 'stream',
                headers
            });

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', 'attachment; filename="tiktok_audio.mp3"');
            audioResponse.data.pipe(res);
        } else {
            // For video, use the normal endpoint
            const apiResponse = await axios.get(`https://www.tikwm.com/api/?url=${url}&hd=1`, { headers });
            
            if (apiResponse.data.code !== 0 || !apiResponse.data.data || !apiResponse.data.data.play) {
                throw new Error('Failed to get video information');
            }

            const videoUrl = apiResponse.data.data.play;
            const videoResponse = await axios.get(videoUrl, {
                responseType: 'stream',
                headers
            });

            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', 'attachment; filename="tiktok_video.mp4"');
            videoResponse.data.pipe(res);
        }

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            error: 'Failed to get download URL',
            details: error.message 
        });
    }
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

        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            error: 'Failed to proxy video',
            details: error.message 
        });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Server error', 
        details: err.message 
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Export the Express API for Vercel
module.exports = app; 
