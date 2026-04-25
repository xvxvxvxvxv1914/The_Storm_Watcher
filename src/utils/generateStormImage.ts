interface StormImageParams {
  score: number;
  status: string;
  kp: number;
  windSpeed: number | null;
  xrayClass: string | null;
}

function scoreColor(score: number): string {
  if (score >= 76) return '#ef4444';
  if (score >= 51) return '#f97316';
  if (score >= 26) return '#eab308';
  return '#10b981';
}

export async function generateStormScoreImage(params: StormImageParams): Promise<Blob> {
  const { score, status, kp, windSpeed, xrayClass } = params;
  const W = 1200, H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0a1a');
  bg.addColorStop(1, '#0d0d24');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle star field
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() < 0.2 ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Orange glow (top-right)
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 400);
  glow.addColorStop(0, 'rgba(249,115,22,0.18)');
  glow.addColorStop(1, 'rgba(249,115,22,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Purple glow (bottom-left)
  const glow2 = ctx.createRadialGradient(0, H, 0, 0, H, 350);
  glow2.addColorStop(0, 'rgba(124,58,237,0.12)');
  glow2.addColorStop(1, 'rgba(124,58,237,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // Brand header
  ctx.font = 'bold 22px "Space Grotesk", Arial, sans-serif';
  ctx.fillStyle = '#f97316';
  ctx.textAlign = 'left';
  ctx.fillText('★  THE STORM WATCHER', 64, 72);

  // URL (top-right)
  ctx.font = '18px "Space Grotesk", Arial, sans-serif';
  ctx.fillStyle = '#4a5568';
  ctx.textAlign = 'right';
  ctx.fillText('thestormwatcher.com', W - 64, 72);

  // "STORM SCORE" label
  ctx.font = 'bold 20px "Space Grotesk", Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '0.2em';
  ctx.fillText('STORM SCORE', W / 2, 175);
  ctx.letterSpacing = '0';

  // Score number (gradient)
  const color = scoreColor(score);
  const scoreGrad = ctx.createLinearGradient(W / 2 - 120, 0, W / 2 + 120, 0);
  scoreGrad.addColorStop(0, color);
  scoreGrad.addColorStop(1, score >= 51 ? '#fbbf24' : color);
  ctx.font = 'bold 220px "Space Grotesk", Arial, sans-serif';
  ctx.fillStyle = scoreGrad;
  ctx.textAlign = 'center';
  ctx.fillText(String(score), W / 2, 400);

  // Status badge
  const badgeW = 220, badgeH = 44, badgeX = W / 2 - badgeW / 2, badgeY = 420;
  const badgeGrad = ctx.createLinearGradient(badgeX, 0, badgeX + badgeW, 0);
  badgeGrad.addColorStop(0, color + '40');
  badgeGrad.addColorStop(1, color + '20');
  ctx.fillStyle = badgeGrad;
  ctx.strokeStyle = color + '80';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 22);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 18px "Space Grotesk", Arial, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(status.toUpperCase(), W / 2, badgeY + 28);

  // Stats row
  const stats: string[] = [`Kp ${kp.toFixed(1)}`];
  if (windSpeed && windSpeed > 0) stats.push(`Solar Wind ${Math.round(windSpeed)} km/s`);
  if (xrayClass) stats.push(`X-ray Class ${xrayClass}`);
  const statsText = stats.join('   •   ');
  ctx.font = '20px "Space Grotesk", Arial, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.fillText(statsText, W / 2, 535);

  // Bottom tagline
  ctx.font = '16px "Space Grotesk", Arial, sans-serif';
  ctx.fillStyle = '#374151';
  ctx.fillText('Real-time space weather monitoring', W / 2, 588);

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
}
