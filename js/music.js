(function () {
    'use strict';

    // 当前正在拖动的进度条（全局只允许一个）
    var dragState = null;

    function initMusicBlocks() {
        var musicBlocks = document.querySelectorAll('div[music]');

        musicBlocks.forEach(function (block) {
            // pjax 切页后会重新执行，已初始化的块直接跳过
            if (block.dataset.musicReady === '1') return;
            block.dataset.musicReady = '1';

            var title = block.getAttribute('Title');
            var imgSrc = block.getAttribute('Img');
            var audioSrc = block.getAttribute('File');

            var playerHTML = `
                <div class="player">
                    <div class="cover-container">
                        <div class="cover" style="background-image: url('${imgSrc}');" ></div>
                        <button class="playBtn">&#9658;</button>
                    </div>
                    <div class="song-info">
                        <div class="song-title">${title}</div>
                        <div class="progress-container">
                            <div class="preview-progress"></div>
                            <div class="progress"></div>
                        </div>
                        <div class="time">0:00 / 0:00</div>
                    </div>
                    <audio class="audio-player" src="${audioSrc}" preload="none"></audio>
                </div>
            `;

            block.innerHTML = playerHTML;

            var img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imgSrc;
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');
                canvas.width = 10;
                canvas.height = 10;
                context.drawImage(img, 0, 0, 10, 10);

                try {
                    var imageData = context.getImageData(0, 0, 10, 10);
                    var data = imageData.data;
                    var r = 0, g = 0, b = 0;
                    for (var i = 0; i < data.length; i += 4) {
                        r += data[i];
                        g += data[i + 1];
                        b += data[i + 2];
                    }
                    var count = data.length / 4;
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);

                    // 将 RGB 转为 HSL 以便调整饱和度
                    var r2 = r / 255, g2 = g / 255, b2 = b / 255;
                    var max = Math.max(r2, g2, b2), min = Math.min(r2, g2, b2);
                    var h, s, l = (max + min) / 2;
                    if (max == min) {
                        h = s = 0;
                    } else {
                        var d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        switch (max) {
                            case r2: h = (g2 - b2) / d + (g2 < b2 ? 6 : 0); break;
                            case g2: h = (b2 - r2) / d + 2; break;
                            case b2: h = (r2 - g2) / d + 4; break;
                        }
                        h /= 6;
                    }
                    h = Math.round(h * 360);
                    s = Math.min(100, Math.round(s * 100 * 1.6)); // 提升 1.6 倍饱和度，让色彩更浓郁
                    l = Math.round(l * 100);

                    var brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    var isDark = brightness < 128;

                    // 背景色：左浅右深渐变，使用增强饱和度后的 HSL
                    const alphaLeft = isDark ? 0.7 : 0.15;
                    const alphaRight = isDark ? 0.95 : 0.4;
                    block.querySelector('.player').style.background = `linear-gradient(to right, hsla(${h}, ${s}%, ${l}%, ${alphaLeft}) 0%, hsla(${h}, ${s}%, ${l}%, ${alphaRight}) 100%)`;
                    block.querySelector('.player').style.borderColor = `hsla(${h}, ${s}%, ${l}%, 0.4)`;
                    block.querySelector('.player').style.borderStyle = 'solid';
                    block.querySelector('.player').style.borderWidth = '1px';

                    // 文字颜色：基于主色的深色或浅色
                    var textColor, secondaryColor;
                    if (isDark) {
                        textColor = `rgba(255, 255, 255, 0.95)`;
                        secondaryColor = `rgba(255, 255, 255, 0.65)`;
                    } else {
                        // 亮色背景下，文字使用加深后的主色调
                        textColor = `hsla(${h}, ${s}%, ${Math.max(0, l-50)}%, 0.9)`;
                        secondaryColor = `hsla(${h}, ${s}%, ${Math.max(0, l-40)}%, 0.6)`;
                    }

                    block.querySelector('.song-title').style.color = textColor;
                    block.querySelector('.time').style.color = secondaryColor;
                    block.querySelector('.progress-container').style.backgroundColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';

                    // 进度条也使用主色调
                    block.querySelector('.progress').style.backgroundColor = isDark ? `rgba(255,255,255,0.9)` : `hsla(${h}, ${s}%, ${Math.max(0, l-20)}%, 0.8)`;
                } catch (e) {
                    console.error("Color extraction failed:", e);
                }
            };

            var audioPlayer = block.querySelector('.audio-player');
            var cover = block.querySelector('.cover');
            var progressContainer = block.querySelector('.progress-container');
            var time = block.querySelector('.time');

            audioPlayer.loop = true;
            cover.classList.add('rotating');

            block.querySelector('.playBtn').addEventListener('click', function () {
                togglePlayPause(block);
            });

            progressContainer.addEventListener('mousedown', function (e) {
                dragState = { block: block, container: progressContainer, audio: audioPlayer };
                updatePreviewProgress(e);
            });

            progressContainer.addEventListener('mousemove', function (e) {
                if (dragState && dragState.block === block) {
                    updatePreviewProgress(e);
                }
            });

            audioPlayer.addEventListener('timeupdate', function () {
                updateProgress(block);
            });
        });
    }

    function togglePlayPause(block) {
        var audioPlayer = block.querySelector('.audio-player');
        var playBtn = block.querySelector('.playBtn');
        if (!audioPlayer || !playBtn) return;

        if (audioPlayer.paused) {
            // 暂停其他所有正在播放的音乐
            document.querySelectorAll('div[music] .audio-player').forEach(function (otherAudio) {
                if (otherAudio !== audioPlayer && !otherAudio.paused) {
                    otherAudio.pause();
                    var otherBlock = otherAudio.closest('div[music]');
                    if (otherBlock) {
                        var otherPlayBtn = otherBlock.querySelector('.playBtn');
                        if (otherPlayBtn) otherPlayBtn.innerHTML = '&#9658;';
                        otherBlock.classList.remove('playing');
                    }
                }
            });

            audioPlayer.play();
            playBtn.innerHTML = '&#10074;&#10074;';
            block.classList.add('playing');
        } else {
            audioPlayer.pause();
            playBtn.innerHTML = '&#9658;';
            block.classList.remove('playing');
        }
    }

    function updatePreviewProgress(e) {
        if (!dragState) return;
        var container = dragState.container;
        var rect = container.getBoundingClientRect();
        var previewPercent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        var previewProgress = container.querySelector('.preview-progress');
        if (previewProgress) previewProgress.style.width = previewPercent + '%';
    }

    function setProgress(state, e) {
        var container = state.container;
        var audio = state.audio;
        var rect = container.getBoundingClientRect();
        var ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        if (audio.duration) {
            audio.currentTime = ratio * audio.duration;
            updateProgress(state.block);
        }
    }

    function updateProgress(block) {
        var audioPlayer = block.querySelector('.audio-player');
        var progress = block.querySelector('.progress');
        var time = block.querySelector('.time');
        if (!audioPlayer || !progress || !time) return;

        var currentTime = audioPlayer.currentTime;
        var duration = audioPlayer.duration;
        var progressPercent = duration ? (currentTime / duration) * 100 : 0;
        progress.style.width = progressPercent + '%';
        updateTimeDisplay(time, currentTime, duration);
    }

    function updateTimeDisplay(time, currentTime, duration) {
        var currentMinutes = Math.floor(currentTime / 60);
        var currentSeconds = Math.floor(currentTime % 60);
        if (currentSeconds < 10) currentSeconds = '0' + currentSeconds;

        var durationMinutes = Math.floor(duration / 60);
        var durationSeconds = Math.floor(duration % 60);
        if (durationSeconds < 10) durationSeconds = '0' + durationSeconds;

        time.textContent = currentMinutes + ':' + currentSeconds + ' / ' + durationMinutes + ':' + durationSeconds;
    }

    // pjax 切页前暂停页内播放器（DOM 被移除后 audio 仍可能继续播放）
    function pauseInlinePlayers() {
        document.querySelectorAll('div[music] .audio-player').forEach(function (audio) {
            if (!audio.paused) {
                audio.pause();
                var block = audio.closest('div[music]');
                if (block) {
                    block.classList.remove('playing');
                    var playBtn = block.querySelector('.playBtn');
                    if (playBtn) playBtn.innerHTML = '&#9658;';
                }
            }
        });
        dragState = null;
    }

    document.addEventListener('mouseup', function (e) {
        if (!dragState) return;
        var state = dragState;
        dragState = null;
        setProgress(state, e);
        var preview = state.container.querySelector('.preview-progress');
        if (preview) preview.style.width = '0%';
    });

    document.addEventListener('keydown', function (e) {
        if (e.code !== 'Space') return;
        var target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
        var block = document.querySelector('div[music].playing') || document.querySelector('div[music]');
        if (!block) return;
        e.preventDefault();
        togglePlayPause(block);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMusicBlocks);
    } else {
        initMusicBlocks();
    }

    if (window.btf && typeof window.btf.addGlobalFn === 'function') {
        window.btf.addGlobalFn('pjaxComplete', initMusicBlocks, 'music_init');
        window.btf.addGlobalFn('pjaxSend', pauseInlinePlayers, 'music_pause');
    } else {
        document.addEventListener('pjax:complete', initMusicBlocks);
        document.addEventListener('pjax:send', pauseInlinePlayers);
    }
})();
