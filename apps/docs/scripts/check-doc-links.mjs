import fs from "node:fs";
import path from "node:path";

const docRoot = path.resolve(new URL("..", import.meta.url).pathname);
const markdownFiles = [];

function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (
			["node_modules", ".vitepress/dist", ".vitepress/cache"].some((skip) =>
				path.join(dir, entry.name).includes(skip),
			)
		)
			continue;
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(file);
		else if (entry.isFile() && entry.name.endsWith(".md"))
			markdownFiles.push(file);
	}
}

function stripAnchor(link) {
	return link.split("#")[0];
}

function isExternal(link) {
	return /^(https?:|mailto:|tel:)/.test(link);
}

function candidateFiles(fromFile, link) {
	const clean = decodeURIComponent(stripAnchor(link));
	if (!clean || isExternal(clean) || clean.startsWith("#")) return [];
	const base = clean.startsWith("/") ? docRoot : path.dirname(fromFile);
	const target = clean.startsWith("/")
		? path.join(base, clean.slice(1))
		: path.resolve(base, clean);
	return [target, `${target}.md`, path.join(target, "index.md")];
}

walk(docRoot);
const problems = [];
const linkPattern = /(?<!!)[[]([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]+")?\)/g;

for (const file of markdownFiles) {
	const text = fs.readFileSync(file, "utf8");
	for (const match of text.matchAll(linkPattern)) {
		const link = match[2];
		const candidates = candidateFiles(file, link);
		if (
			candidates.length &&
			!candidates.some((candidate) => fs.existsSync(candidate))
		) {
			problems.push(`${path.relative(docRoot, file)} -> ${link}`);
		}
	}
}

const forbiddenDirs = ["blog", "changelog"];
for (const dir of forbiddenDirs) {
	if (fs.existsSync(path.join(docRoot, dir))) {
		problems.push(`forbidden docs directory exists: ${dir}`);
	}
}

const forbiddenFiles = [
	"reference/changelog.md",
	"reference/competitors.md",
	"reference/roadmap.md",
];
for (const file of forbiddenFiles) {
	if (fs.existsSync(path.join(docRoot, file))) {
		problems.push(`forbidden docs page exists: ${file}`);
	}
}

if (problems.length) {
	console.error(problems.join("\n"));
	process.exit(1);
}

console.log(
	`Docs link audit passed for ${markdownFiles.length} markdown files.`,
);
