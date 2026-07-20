document.addEventListener('DOMContentLoaded', () => {
	const content = document.getElementById('doc-content');
	if (!content || typeof markdownToHtml !== 'function') return;

	const md = content.textContent.trim();
	content.innerHTML = markdownToHtml(md);
});
