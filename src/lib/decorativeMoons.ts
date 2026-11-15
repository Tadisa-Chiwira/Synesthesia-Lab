/** Static illustration only. No market or audio inputs and no ribbon geometry. */
export function drawAdditionalMoons(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const radius = Math.max(6, Math.min(11, Math.min(width, height) * 0.024));
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.8;
  ctx.translate(width * 0.69, height * 0.21);
  const pearl = ctx.createRadialGradient(-radius * 0.35, -radius * 0.4, 0, 0, 0, radius);
  pearl.addColorStop(0, '#fff8e9');
  pearl.addColorStop(0.55, '#dcdcec');
  pearl.addColorStop(1, '#a9b6cf');
  ctx.fillStyle = pearl;
  ctx.shadowColor = '#c5cee7';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(108,119,155,0.12)';
  for (const [x, y, size] of [[-0.3, -0.2, 0.24], [0.25, 0.3, 0.18], [0.3, -0.42, 0.12]]) {
    ctx.beginPath();
    ctx.ellipse(x * radius, y * radius, size * radius, size * radius * 0.8, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // A fine crescent at the lower left, far below the price band.
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.65;
  ctx.translate(width * 0.27, height * 0.82);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#cddce8';
  ctx.shadowColor = '#b7d1e5';
  ctx.shadowBlur = 6;
  const r = radius * 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.bezierCurveTo(r * 0.65, r * 0.58, r * 0.65, -r * 0.58, 0, -r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
