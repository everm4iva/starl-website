// -- md.js - a tiny markdown to html converter, just enough for the docs --
// no library, no bloat, just the stuff the doc files actually use:
// headings, lists, tables, code, quotes, links, images and the inline basics
// it goes line by line, kinda like reading the file yourself but faster

// -- the html we let through - readmes love their <div align="center"> stuff --
// everything else stays escaped, so random tags can't do anything funny
const HTML_TAGS_ALLOWED = ['div', 'center', 'span', 'sub', 'sup', 'b', 'strong', 'i', 'em', 'u', 's', 'br', 'img', 'a', 'kbd', 'details', 'summary'];
const HTML_ATTRS_ALLOWED = ['align', 'src', 'width', 'height', 'alt', 'href', 'title', 'open'];

// -- keep raw html out, we only trust our own tags --
function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// -- bring the whitelisted tags back after escaping --
// we escape everything first, then only un-escape tags from the allow list,
// with their attributes checked one by one - the polite bouncer approach
function restoreHtml(text) {
	return text.replace(/&lt;(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+=&quot;.*?&quot;)*)\s*(\/?)&gt;/g, (match, close, tag, attrs, selfClose) => {
		tag = tag.toLowerCase();
		if (!HTML_TAGS_ALLOWED.includes(tag)) return match;

		// rebuild attributes, but only the harmless ones
		let clean = '';
		const attrRe = /([a-zA-Z-]+)=&quot;(.*?)&quot;/g;
		let m;
		while ((m = attrRe.exec(attrs)) !== null) {
			const name = m[1].toLowerCase();
			const value = m[2];
			if (!HTML_ATTRS_ALLOWED.includes(name)) continue;
			if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) continue;
			clean += ' ' + name + '="' + value + '"';
		}

		return '<' + close + tag + clean + (selfClose ? ' /' : '') + '>';
	});
}

// -- inline stuff - bold, italic, code, links, images, strikes --
function renderInline(text) {
	let out = escapeHtml(text);

	// stash inline code away first, so nothing inside it gets styled or
	// un-escaped - docs showing html in backticks must stay as text
	const codeStash = [];
	out = out.replace(/`([^`]+)`/g, (m, code) => {
		codeStash.push('<code>' + code + '</code>');
		return '\u0000' + (codeStash.length - 1) + '\u0000';
	});

	// images before links, they share the bracket look
	out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');

	// badge links with an empty target like [x]() - just drop the wrapper
	out = out.replace(/\[([^\]]*)\]\(\)/g, '$1');
	out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

	// bold, italic, strike - the classics
	out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
	out = out.replace(/__([^_]+)__/g, '<b>$1</b>');
	out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>');
	out = out.replace(/~~([^~]+)~~/g, '<s>$1</s>');

	// let the friendly html tags back in, then put the code spans back
	out = restoreHtml(out);
	out = out.replace(/\u0000(\d+)\u0000/g, (m, i) => codeStash[Number(i)]);

	return out;
}

// -- one table row into cells --
function renderTableRow(line, tag) {
	const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|');
	return '<tr>' + cells.map((c) => `<${tag}>${renderInline(c.trim())}</${tag}>`).join('') + '</tr>';
}

// -- the main dish - full markdown text in, html string out --
function markdownToHtml(md) {
	const lines = md.split(/\r?\n/);
	const html = [];

	let inCode = false;
	let listStack = [];
	let inTable = false;
	let inQuote = false;

	// close whatever block is still open, so tags always match up
	function closeLists() {
		while (listStack.length) html.push('</' + listStack.pop() + '>');
	}
	function closeTable() {
		if (inTable) { html.push('</table>'); inTable = false; }
	}
	function closeQuote() {
		if (inQuote) { html.push('</blockquote>'); inQuote = false; }
	}
	function closeAll() {
		closeLists();
		closeTable();
		closeQuote();
	}

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// fenced code blocks swallow everything until the closing fence
		if (/^\s*```/.test(line)) {
			closeAll();
			html.push(inCode ? '</code></pre>' : '<pre><code>');
			inCode = !inCode;
			continue;
		}
		if (inCode) {
			html.push(escapeHtml(line));
			continue;
		}

		// empty line just ends whatever was going on
		if (line.trim() === '') {
			closeAll();
			continue;
		}

		// horizontal rule - the docs love their separators, so do we
		if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
			closeAll();
			html.push('<hr />');
			continue;
		}

		// headings
		const heading = line.match(/^(#{1,6})\s+(.*)$/);
		if (heading) {
			closeAll();
			const level = heading[1].length;
			html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
			continue;
		}

		// blockquotes
		const quote = line.match(/^\s*>\s?(.*)$/);
		if (quote) {
			closeLists();
			closeTable();
			if (!inQuote) { html.push('<blockquote>'); inQuote = true; }
			html.push('<p>' + renderInline(quote[1]) + '</p>');
			continue;
		}

		// tables - a | line followed by more | lines
		if (/^\s*\|.*\|\s*$/.test(line)) {
			closeLists();
			closeQuote();

			// the |---|---| line is just decoration, skip it
			if (/^\s*\|[\s:-]+\|\s*$/.test(line)) continue;

			if (!inTable) {
				html.push('<table>');
				inTable = true;
				html.push(renderTableRow(line, 'th'));
			} else {
				html.push(renderTableRow(line, 'td'));
			}
			continue;
		}
		closeTable();

		// lists - unordered and ordered, with one level of nesting
		const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
		if (li) {
			closeQuote();
			const depth = li[1].length >= 2 ? 2 : 1;
			const tag = /^\d/.test(li[2]) ? 'ol' : 'ul';

			// open or close lists until the stack matches the depth
			while (listStack.length > depth) html.push('</' + listStack.pop() + '>');
			while (listStack.length < depth) { html.push('<' + tag + '>'); listStack.push(tag); }

			html.push('<li>' + renderInline(li[3]) + '</li>');
			continue;
		}
		closeLists();

		// anything else is just a paragraph - unless the line is already
		// html, like those <div align="center"> blocks readmes love,
		// those go in as they are, no <p> wrapper squeezing them
		const rendered = renderInline(line);
		if (/^\s*</.test(rendered)) {
			html.push(rendered);
		} else {
			html.push('<p>' + rendered + '</p>');
		}
	}

	// end of file, close the stragglers
	if (inCode) html.push('</code></pre>');
	closeAll();

	return html.join('\n');
}
