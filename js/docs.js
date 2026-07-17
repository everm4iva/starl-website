// -- docs.js - the living docs page --
// so the idea is: one url.txt file on github lists every doc page and its raw
// url, we fetch that, build the whole nav from it, and render any doc right
// here in the page - new docs show up with zero website updates, rad right?

// -- root config, all in one place so future me can move stuff around --
const DOCS_MANIFEST_URL = 'https://raw.githubusercontent.com/everm4iva/starl/refs/heads/main/docs/url.txt';
const DOCS_GROUP_TITLES = ['START', 'GENERAL', 'RUN YOUR OWN SERVER', 'DEEP DIVES'];
const DOCS_DEFAULT_SLUG = 'index';
const DOCS_HOME_URL = 'https://github.com/everm4iva/starl';

// the parsed manifest lives here: [{ title, docs: [{ slug, url }] }]
let docGroups = [];

// quick lookups, filled after the manifest loads
const slugToUrl = {};
const urlToSlug = {};

// -- manifest parsing - "slug: url" lines, "---" starts a new group --
function parseManifest(text) {
	const groups = [];
	let current = { title: DOCS_GROUP_TITLES[0] || 'DOCS', docs: [] };

	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (line === '') continue;

		// group separator, grab the next title from the list
		if (line === '---') {
			if (current.docs.length) groups.push(current);
			current = { title: DOCS_GROUP_TITLES[groups.length] || 'MORE', docs: [] };
			continue;
		}

		// split only on the first ":" because the url has its own colons
		const sep = line.indexOf(':');
		if (sep === -1) continue;

		const slug = line.slice(0, sep).trim();
		const url = line.slice(sep + 1).trim();
		if (!slug || !url.startsWith('http')) continue;

		current.docs.push({ slug, url });
		slugToUrl[slug] = url;
		urlToSlug[normalizeUrl(url)] = slug;
	}

	if (current.docs.length) groups.push(current);
	return groups;
}

// -- urls can differ in silly ways, flatten them for comparing --
function normalizeUrl(url) {
	return decodeURIComponent(url).toLowerCase().replace(/\/$/, '');
}

// -- slug to a label people can actually read --
function slugToLabel(slug) {
	return slug.replace(/-/g, ' ');
}

// -- build the nav from the parsed groups --
function buildNav() {
	const nav = document.getElementById('doc-nav');
	nav.innerHTML = '';

	for (const group of docGroups) {
		const title = document.createElement('div');
		title.className = 'doc-nav-group';
		title.textContent = group.title;
		nav.appendChild(title);

		for (const doc of group.docs) {
			const link = document.createElement('a');
			link.className = 'doc-nav-link';
			link.href = '#' + doc.slug;
			link.textContent = slugToLabel(doc.slug);
			link.dataset.slug = doc.slug;
			nav.appendChild(link);
		}
	}
}

// -- highlight where you are, like a "you are here" pin --
function markActive(slug) {
	document.querySelectorAll('.doc-nav-link').forEach((link) => {
		link.classList.toggle('active', link.dataset.slug === slug);
	});
}

// -- reader states, all just swapping classes, css does the drama --
function setReaderState(state, message) {
	const reader = document.getElementById('doc-reader');
	reader.className = 'doc-reader ' + state;
	if (message !== undefined) {
		document.getElementById('doc-status-text').textContent = message;
	}
}

// -- fix links and images inside a rendered doc --
// relative links between docs become #slug jumps, everything else
// resolves against the doc's raw url so images still show up
function fixDocLinks(container, baseUrl) {
	container.querySelectorAll('a').forEach((a) => {
		const href = a.getAttribute('href');
		if (!href || href.startsWith('#')) return;

		let resolved;
		try {
			resolved = new URL(href, baseUrl).href;
		} catch {
			return;
		}

		// points at a doc we know? turn it into an in-page jump
		const slug = urlToSlug[normalizeUrl(resolved)];
		if (slug) {
			a.setAttribute('href', '#' + slug);
			return;
		}

		// raw github file we don't have in the manifest - send them to the pretty view
		if (resolved.includes('raw.githubusercontent.com')) {
			resolved = resolved
				.replace('raw.githubusercontent.com', 'github.com')
				.replace('/refs/heads/main/', '/blob/main/');
		}

		a.setAttribute('href', resolved);
		a.setAttribute('target', '_blank');
		a.setAttribute('rel', 'noopener');
	});

	container.querySelectorAll('img').forEach((img) => {
		const src = img.getAttribute('src');
		if (!src || src.startsWith('http') || src.startsWith('data:')) return;
		try {
			img.setAttribute('src', new URL(src, baseUrl).href);
		} catch {
			return;
		}
	});
}

// -- fetch one doc and render it in the reader --
// scrollUp only when jumping between docs, first load stays at the hero
async function loadDoc(slug, scrollUp) {
	const url = slugToUrl[slug];
	const content = document.getElementById('doc-content');

	// unknown slug? just go home instead of exploding
	if (!url) {
		slug = DOCS_DEFAULT_SLUG;
		if (!slugToUrl[slug]) return;
		return loadDoc(slug, scrollUp);
	}

	markActive(slug);
	setReaderState('loading', 'FETCHING "' + slug.toUpperCase() + '"...');

	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error('got a ' + res.status);
		const md = await res.text();

		content.innerHTML = markdownToHtml(md);
		fixDocLinks(content, url);
		setReaderState('ready');

		document.title = 'starl docs - ' + slugToLabel(slug);
		document.getElementById('doc-github-link').href = url
			.replace('raw.githubusercontent.com', 'github.com')
			.replace('/refs/heads/main/', '/blob/main/');

		// jump back up so the doc starts at the top
		if (scrollUp) document.getElementById('doc-reader').scrollIntoView();
	} catch (err) {
		setReaderState('error', 'COULD NOT FETCH "' + slug + '" - ' + err.message);
	}
}

// -- hash routing, the whole "no page reload" trick --
function currentSlug() {
	return decodeURIComponent(location.hash.replace(/^#/, '')) || DOCS_DEFAULT_SLUG;
}

window.addEventListener('hashchange', () => loadDoc(currentSlug(), true));

// -- boot - grab the manifest, build everything, load the first doc --
async function bootDocs() {
	setReaderState('loading', 'FETCHING THE DOC LIST...');

	try {
		const res = await fetch(DOCS_MANIFEST_URL);
		if (!res.ok) throw new Error('got a ' + res.status);

		docGroups = parseManifest(await res.text());
		if (!docGroups.length) throw new Error('the list came back empty');

		buildNav();
		loadDoc(currentSlug());
	} catch (err) {
		setReaderState('error', 'COULD NOT FETCH THE DOC LIST - ' + err.message);
		document.getElementById('doc-github-link').href = DOCS_HOME_URL;
	}
}

document.addEventListener('DOMContentLoaded', bootDocs);
