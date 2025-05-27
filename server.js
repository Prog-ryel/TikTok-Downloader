const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
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

        // Modify the response to use our proxy for video playback
        if (apiResponse.data.data && apiResponse.data.data.play) {
            const originalUrl = apiResponse.data.data.play;
            apiResponse.data.data.play = `/proxy/video?url=${encodeURIComponent(originalUrl)}`;
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
app.get('/api/download', async (req, res) => {
    try {
        const { url, format } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.tiktok.com/'
        };

        // Get video info first
        const apiResponse = await axios.get(`https://www.tikwm.com/api/?url=${url}`, { headers });
        
        if (apiResponse.data.code !== 0 || !apiResponse.data.data || !apiResponse.data.data.play) {
            throw new Error('Failed to get video information');
        }

        const videoUrl = apiResponse.data.data.play;
        const videoTitle = apiResponse.data.data.title || 'tiktok_video';
        
        // Stream the video
        const videoResponse = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            headers
        });

        // Set headers for download
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
        
        // Pipe the video stream to response
        videoResponse.data.pipe(res);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            error: 'Failed to download video',
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

// For local development
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// Export the Express API for Vercel
module.exports = app; 
