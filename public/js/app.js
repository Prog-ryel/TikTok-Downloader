document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const videoUrlInput = document.getElementById('videoUrl');
    const pasteBtn = document.getElementById('pasteBtn');
    const clearBtn = document.getElementById('clearBtn');
    const previewBtn = document.getElementById('previewBtn');
    const previewSection = document.querySelector('.preview-section');
    const downloadBtn = document.getElementById('downloadBtn');
    const progressSection = document.querySelector('.progress-section');
    const progressBar = document.querySelector('.progress');
    const statusText = document.getElementById('statusText');
    const openDownloadsBtn = document.getElementById('openDownloadsBtn');
    const videoThumbnail = document.getElementById('videoThumbnail');
    const videoTitle = document.getElementById('videoTitle');
    const videoAuthor = document.getElementById('videoAuthor');
    const videoDuration = document.getElementById('videoDuration').querySelector('span');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoPlayerSection = document.querySelector('.video-player-section');
    const viewVideoBtn = document.getElementById('viewVideoBtn');

    let videoData = null;

    // Event Listeners
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            videoUrlInput.value = text;
            fetchVideoInfo();
        } catch (err) {
            showError('Failed to paste from clipboard');
        }
    });

    clearBtn.addEventListener('click', () => {
        videoUrlInput.value = '';
        previewSection.style.display = 'none';
        progressSection.style.display = 'none';
        videoPlayerSection.style.display = 'none';
        videoPlayer.src = '';
        videoData = null;
        downloadBtn.removeAttribute('href');
        downloadBtn.style.pointerEvents = 'none';
        downloadBtn.style.opacity = '0.5';
    });

    previewBtn.addEventListener('click', fetchVideoInfo);
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchVideoInfo();
        }
    });

    // Handle View Video button
    viewVideoBtn.addEventListener('click', () => {
        if (videoData && videoData.play) {
            if (videoPlayerSection.style.display === 'none') {
                videoPlayerSection.style.display = 'block';
                videoPlayer.src = videoData.play;
                videoPlayer.load();
                videoPlayer.play().catch(error => {
                    console.log('Video playback failed:', error);
                });
            } else {
                videoPlayerSection.style.display = 'none';
                videoPlayer.pause();
            }
        }
    });

    // Handle format change
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const format = radio.value;
            if (format === 'mp3') {
                viewVideoBtn.style.display = 'none';
                videoPlayerSection.style.display = 'none';
                videoPlayer.pause();
            } else {
                viewVideoBtn.style.display = 'block';
            }
        });
    });

    // Handle download button click
    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        if (!videoData) {
            showError('Please preview a video first');
            return;
        }
        startDownload();
    });

    openDownloadsBtn.addEventListener('click', () => {
        window.open('/downloads', '_blank');
    });

    // Functions
    async function fetchVideoInfo() {
        const url = videoUrlInput.value.trim();
        if (!url) {
            showError('Please enter a TikTok video URL');
            return;
        }

        try {
            updateStatus('Fetching video information...', 20);
            progressSection.style.display = 'block';
            videoPlayerSection.style.display = 'none';
            
            // Disable download button while fetching
            downloadBtn.style.pointerEvents = 'none';
            downloadBtn.style.opacity = '0.5';

            const response = await fetch('/api/video-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();
            if (data.code === 0 && data.data) {
                videoData = data.data;
                displayVideoInfo(videoData);
                previewSection.style.display = 'block';
                updateStatus('Video information loaded successfully!', 100);
                
                // Enable download button
                downloadBtn.style.pointerEvents = 'auto';
                downloadBtn.style.opacity = '1';
            } else {
                throw new Error(data.msg || 'Failed to fetch video information');
            }
        } catch (error) {
            showError(error.message);
            downloadBtn.style.pointerEvents = 'none';
            downloadBtn.style.opacity = '0.5';
        }
    }

    function displayVideoInfo(data) {
        if (!data) return;
        videoThumbnail.src = data.cover || '';
        videoTitle.textContent = data.title || 'Untitled';
        videoAuthor.textContent = `Author: ${data.author?.nickname || 'Unknown'}`;
        videoDuration.textContent = `${data.duration || 0} seconds`;
    }

    async function startDownload() {
        if (!videoData) {
            showError('No video data available');
            return;
        }

        try {
            const format = document.querySelector('input[name="format"]:checked').value;
            updateStatus('Starting download...', 20);
            progressSection.style.display = 'block';

            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    url: videoUrlInput.value.trim(),
                    format 
                }),
            });

            const data = await response.json();
            if (data.success) {
                updateStatus('Download ready!', 100);
                
                // Create download link and trigger download
                const downloadUrl = data.file;
                const filename = `tiktok_video.${format}`;
                
                const tempLink = document.createElement('a');
                tempLink.href = downloadUrl;
                tempLink.download = filename;
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
            } else {
                throw new Error(data.error || 'Download failed');
            }
        } catch (error) {
            showError(error.message);
        }
    }

    function updateStatus(message, progress) {
        statusText.textContent = message;
        progressBar.style.width = `${progress}%`;
    }

    function showError(message) {
        updateStatus(`Error: ${message}`, 0);
        progressSection.style.display = 'block';
    }
}); 