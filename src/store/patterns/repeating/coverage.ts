import {HelperCanvas} from "../../../utils/canvas/helpers/base";

export const paintCoverage = (
    shape: HelperCanvas,
    trail: {x: number, y: number}[],
    painted: number,
    originX: number,
    originY: number,
    size: number,
    cap: CanvasLineCap,
    join: CanvasLineJoin,
): number => {
    if (trail.length < 2 || size <= 0) return painted;
    const full = painted <= 0 || trail.length - painted !== 1;
    const ctx = shape.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (full) ctx.clearRect(0, 0, shape.canvas.width, shape.canvas.height);
    const seg = full ? trail : trail.slice(-3);
    ctx.setTransform(1, 0, 0, 1, -originX, -originY);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = size;
    ctx.lineCap = cap;
    ctx.lineJoin = join;
    ctx.beginPath();
    ctx.moveTo(seg[0].x, seg[0].y);
    for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return trail.length;
};
