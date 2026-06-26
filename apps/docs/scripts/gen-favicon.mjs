// Generates favicon.ico for both apps from the TekMemo brand mark, with no
// external dependencies. The mark is pure stroked geometry (brackets + memory
// layers), so we rasterize each segment as an anti-aliased capsule (round caps)
// via per-pixel distance coverage, encode PNG frames with Node's zlib, and pack
// them into a PNG-based .ico. Run: node apps/docs/scripts/gen-favicon.mjs
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// Brand palette (light variant — vivid on both light and dark tab bars).
const BLUE = [0x25, 0x8a, 0xcb];
const GREEN = [0x4c, 0xae, 0x61];

// Geometry in a 100x100 model space, mirroring logo.svg.
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (t) => [
	Math.round(lerp(BLUE[0], GREEN[0], t)),
	Math.round(lerp(BLUE[1], GREEN[1], t)),
	Math.round(lerp(BLUE[2], GREEN[2], t)),
];

// Each shape: list of segments [x1,y1,x2,y2], a stroke width, and a color fn(modelY).
const SHAPES = [
	// Isometric layered stack (gradient blue -> green by vertical position 28..62):
	// a diamond top face over two stacked layer edges.
	{
		width: 6,
		color: (y) => mix(Math.min(1, Math.max(0, (y - 28) / 34))),
		segs: [
			// Diamond top face (closed).
			[50, 28, 66, 37],
			[66, 37, 50, 46],
			[50, 46, 34, 37],
			[34, 37, 50, 28],
			// Second layer edge (chevron).
			[34, 45, 50, 54],
			[50, 54, 66, 45],
			// Third layer edge (chevron).
			[34, 53, 50, 62],
			[50, 62, 66, 53],
		],
	},
	// Left bracket (blue).
	{
		width: 6,
		color: () => BLUE,
		segs: [
			[25, 25, 5, 50],
			[5, 50, 25, 75],
		],
	},
	// Right bracket (green).
	{
		width: 6,
		color: () => GREEN,
		segs: [
			[75, 25, 95, 50],
			[95, 50, 75, 75],
		],
	},
];

function distToSeg(px, py, x1, y1, x2, y2) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len2 = dx * dx + dy * dy || 1;
	let t = ((px - x1) * dx + (py - y1) * dy) / len2;
	t = Math.max(0, Math.min(1, t));
	const cx = x1 + t * dx;
	const cy = y1 + t * dy;
	return Math.hypot(px - cx, py - cy);
}

// Render an S x S RGBA buffer.
function render(S) {
	const scale = S / 100;
	const buf = Buffer.alloc(S * S * 4); // transparent
	for (let py = 0; py < S; py++) {
		for (let px = 0; px < S; px++) {
			// Pixel center Y in model space (drives the vertical color gradient).
			const my = (py + 0.5) / scale;
			let r = 0;
			let g = 0;
			let b = 0;
			let a = 0; // accumulated (premultiplied) RGBA in 0..1
			for (const shape of SHAPES) {
				const halfDev = (shape.width / 2) * scale;
				let cov = 0;
				for (const [x1, y1, x2, y2] of shape.segs) {
					// Distance in device pixels for consistent 1px anti-aliasing.
					const d = distToSeg(px + 0.5, py + 0.5, x1 * scale, y1 * scale, x2 * scale, y2 * scale);
					cov = Math.max(cov, Math.min(1, halfDev + 0.5 - d));
					if (cov >= 1) break;
				}
				if (cov <= 0) continue;
				const [cr, cg, cb] = shape.color(my);
				// src-over (premultiplied).
				const sa = cov;
				r = cr / 255 * sa + r * (1 - sa);
				g = cg / 255 * sa + g * (1 - sa);
				b = cb / 255 * sa + b * (1 - sa);
				a = sa + a * (1 - sa);
			}
			const i = (py * S + px) * 4;
			if (a > 0) {
				buf[i] = Math.round((r / a) * 255);
				buf[i + 1] = Math.round((g / a) * 255);
				buf[i + 2] = Math.round((b / a) * 255);
				buf[i + 3] = Math.round(a * 255);
			}
		}
	}
	return buf;
}

// --- PNG encoding ---------------------------------------------------------
const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();
function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length, 0);
	const typeBuf = Buffer.from(type, "ascii");
	const body = Buffer.concat([typeBuf, data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body), 0);
	return Buffer.concat([len, body, crc]);
}
function encodePNG(S, rgba) {
	const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(S, 0);
	ihdr.writeUInt32BE(S, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // color type RGBA
	// raw scanlines with filter byte 0
	const stride = S * 4;
	const raw = Buffer.alloc((stride + 1) * S);
	for (let y = 0; y < S; y++) {
		raw[y * (stride + 1)] = 0;
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
	}
	const idat = deflateSync(raw, { level: 9 });
	return Buffer.concat([
		sig,
		chunk("IHDR", ihdr),
		chunk("IDAT", idat),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

// --- ICO packing (PNG frames) --------------------------------------------
function encodeICO(frames) {
	const count = frames.length;
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0); // reserved
	header.writeUInt16LE(1, 2); // type 1 = icon
	header.writeUInt16LE(count, 4);
	const dir = Buffer.alloc(16 * count);
	let offset = 6 + 16 * count;
	const datas = [];
	frames.forEach((f, i) => {
		const e = i * 16;
		dir[e] = f.size >= 256 ? 0 : f.size; // width
		dir[e + 1] = f.size >= 256 ? 0 : f.size; // height
		dir[e + 2] = 0; // palette
		dir[e + 3] = 0; // reserved
		dir.writeUInt16LE(1, e + 4); // planes
		dir.writeUInt16LE(32, e + 6); // bpp
		dir.writeUInt32LE(f.png.length, e + 8);
		dir.writeUInt32LE(offset, e + 12);
		offset += f.png.length;
		datas.push(f.png);
	});
	return Buffer.concat([header, dir, ...datas]);
}

const SIZES = [16, 32, 48, 64];
const frames = SIZES.map((size) => ({ size, png: encodePNG(size, render(size)) }));
const ico = encodeICO(frames);

const targets = [
	new URL("../public/favicon.ico", import.meta.url),
	new URL("../../cloud/public/favicon.ico", import.meta.url),
];
for (const t of targets) {
	writeFileSync(t, ico);
	console.log("wrote", t.pathname, `(${ico.length} bytes, sizes ${SIZES.join("/")})`);
}
