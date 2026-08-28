/**
 * Share Image Generator
 * Creates shareable result cards using Canvas API
 * Formats: 9:16 (Story), 1:1 (Square)
 */

const ShareImage = (function() {
  'use strict';

  // Color palette
  const COLORS = {
    purpleStart: '#7c3aed',
    purpleEnd: '#ec4899',
    white: '#ffffff',
    lightPurple: '#f3e8ff',
    dark: '#1f2937',
    muted: '#6b7280'
  };

  // Trait colors from VyliumProfile
  const TRAIT_COLORS = {
    R: '#ef4444',
    I: '#3b82f6',
    A: '#ec4899',
    S: '#10b981',
    E: '#f59e0b',
    C: '#6366f1'
  };

  /**
   * Generate a story-format (9:16) share card
   */
  async function generateStoryCard(profile, options = {}) {
    const width = 1080;
    const height = 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, COLORS.purpleStart);
    gradient.addColorStop(1, COLORS.purpleEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 100 + Math.random() * 200;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // "MY FUTURE TYPE" label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 36px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MY VYLIUM TYPE', width / 2, 280);

    // Emoji
    ctx.font = '200px sans-serif';
    ctx.fillText(profile.type?.emoji || '🧭', width / 2, 550);

    // Type name
    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 72px Nunito, sans-serif';
    ctx.fillText(profile.type?.name || 'Your Type', width / 2, 700);

    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.2, 780);
    ctx.lineTo(width * 0.8, 780);
    ctx.stroke();

    // Top traits
    ctx.font = 'bold 32px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('STRONGEST TRAITS', width / 2, 880);

    const traits = profile.topDimensions?.slice(0, 3) || [];
    let traitY = 960;

    traits.forEach((trait, i) => {
      // Trait pill background
      const pillWidth = 400;
      const pillHeight = 80;
      const pillX = (width - pillWidth) / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      roundRect(ctx, pillX, traitY, pillWidth, pillHeight, 40);
      ctx.fill();

      // Trait label
      ctx.fillStyle = COLORS.white;
      ctx.font = 'bold 36px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(trait.label, width / 2 - 60, traitY + 52);

      // Percentage
      ctx.font = '32px Nunito, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(`${profile.percentages[trait.code]}%`, width / 2 + 140, traitY + 52);

      traitY += 100;
    });

    // CTA section
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    roundRect(ctx, 100, 1400, width - 200, 200, 30);
    ctx.fill();

    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 48px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('What type are you?', width / 2, 1490);

    ctx.font = '32px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Take the 3-minute test', width / 2, 1550);

    // App branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '28px Nunito, sans-serif';
    ctx.fillText('Jasmine\'s Scholarship Hub', width / 2, 1800);

    // QR code placeholder (if URL provided)
    if (options.shareUrl) {
      // In a real implementation, you'd use a QR library
      // For now, show the short URL
      ctx.fillStyle = COLORS.white;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '24px Nunito, sans-serif';
      ctx.fillText(options.shareUrl, width / 2, 1850);
    }

    return canvas;
  }

  /**
   * Generate a square (1:1) share card
   */
  async function generateSquareCard(profile, options = {}) {
    const size = 1080;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, COLORS.purpleStart);
    gradient.addColorStop(1, COLORS.purpleEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Emoji
    ctx.font = '150px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(profile.type?.emoji || '🧭', size / 2, 300);

    // Type name
    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 64px Nunito, sans-serif';
    ctx.fillText(profile.type?.name || 'Your Type', size / 2, 420);

    // Top traits as pills
    const traits = profile.topDimensions?.slice(0, 3) || [];
    const traitWidth = 200;
    const totalWidth = traits.length * traitWidth + (traits.length - 1) * 20;
    let traitX = (size - totalWidth) / 2;

    traits.forEach((trait, i) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      roundRect(ctx, traitX, 500, traitWidth, 60, 30);
      ctx.fill();

      ctx.fillStyle = COLORS.white;
      ctx.font = 'bold 24px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(trait.label, traitX + traitWidth / 2, 540);

      traitX += traitWidth + 20;
    });

    // CTA
    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 36px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('What type are you?', size / 2, 720);

    // Branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '24px Nunito, sans-serif';
    ctx.fillText('Jasmine\'s Scholarship Hub', size / 2, 950);

    return canvas;
  }

  /**
   * Helper: Draw rounded rectangle
   */
  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Download the generated image
   */
  function downloadImage(canvas, filename = 'my-future-type.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  /**
   * Get image as Blob for sharing
   */
  function getImageBlob(canvas) {
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    });
  }

  /**
   * Share image using Web Share API (if available)
   */
  async function shareImage(canvas, title, text) {
    if (!navigator.canShare) {
      // Fallback: download the image
      downloadImage(canvas);
      return false;
    }

    try {
      const blob = await getImageBlob(canvas);
      const file = new File([blob], 'my-vylium-type.png', { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: title || 'My Vylium Type',
          text: text || 'See what Vylium Type you get!',
          files: [file]
        });
        return true;
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('Image share failed:', e);
      }
    }

    // Fallback: download
    downloadImage(canvas);
    return false;
  }

  /**
   * Generate and share/download a share card
   */
  async function createAndShare(profile, format = 'story', options = {}) {
    let canvas;

    if (format === 'square') {
      canvas = await generateSquareCard(profile, options);
    } else {
      canvas = await generateStoryCard(profile, options);
    }

    if (options.download) {
      downloadImage(canvas, options.filename);
      return { success: true, action: 'download' };
    }

    const shared = await shareImage(
      canvas,
      'My Vylium Type',
      `I got ${profile.type?.name}. What type are you?`
    );

    return { success: true, action: shared ? 'shared' : 'download', canvas };
  }

  /**
   * Render share card options UI
   */
  function renderShareOptions(containerId, profile) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="share-image-options">
        <h4 style="margin-bottom: 16px; font-weight: 700;">Save or Share Your Result</h4>

        <div class="share-format-buttons" style="display: flex; gap: 12px; margin-bottom: 20px;">
          <button class="share-format-btn" data-format="story" style="flex: 1; padding: 16px; background: var(--card); border: 2px solid var(--border); border-radius: 12px; cursor: pointer;">
            <div style="font-size: 2rem; margin-bottom: 8px;">📱</div>
            <div style="font-weight: 700;">Story</div>
            <div style="font-size: 0.8rem; color: var(--muted);">9:16</div>
          </button>
          <button class="share-format-btn" data-format="square" style="flex: 1; padding: 16px; background: var(--card); border: 2px solid var(--border); border-radius: 12px; cursor: pointer;">
            <div style="font-size: 2rem; margin-bottom: 8px;">📷</div>
            <div style="font-weight: 700;">Square</div>
            <div style="font-size: 0.8rem; color: var(--muted);">1:1</div>
          </button>
        </div>

        <div class="share-action-buttons" style="display: flex; flex-direction: column; gap: 10px;">
          <button id="share-save-btn" class="btn btn-primary" style="width: 100%;">
            💾 Save Image
          </button>
          <button id="share-native-btn" class="btn btn-secondary" style="width: 100%;">
            📤 Share
          </button>
        </div>

        <div id="share-preview" style="margin-top: 20px; text-align: center;"></div>
      </div>
    `;

    let selectedFormat = 'story';

    // Format selection
    container.querySelectorAll('.share-format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.share-format-btn').forEach(b => {
          b.style.borderColor = 'var(--border)';
        });
        btn.style.borderColor = 'var(--jazz-purple)';
        selectedFormat = btn.dataset.format;
      });
    });

    // Select story by default
    container.querySelector('[data-format="story"]').style.borderColor = 'var(--jazz-purple)';

    // Save button
    container.querySelector('#share-save-btn').addEventListener('click', async () => {
      await createAndShare(profile, selectedFormat, { download: true });
      if (typeof ViralShare !== 'undefined') {
        ViralShare.trackEvent('share_image_saved', { format: selectedFormat });
      }
    });

    // Share button
    container.querySelector('#share-native-btn').addEventListener('click', async () => {
      const result = await createAndShare(profile, selectedFormat);
      if (typeof ViralShare !== 'undefined') {
        ViralShare.trackEvent('share_image_shared', { format: selectedFormat, action: result.action });
      }
    });
  }

  return {
    generateStoryCard,
    generateSquareCard,
    downloadImage,
    getImageBlob,
    shareImage,
    createAndShare,
    renderShareOptions
  };
})();

if (typeof window !== 'undefined') {
  window.ShareImage = ShareImage;
}
