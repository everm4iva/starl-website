// -- drag.js - grab stuff, throw it around, own the page --
// so the deal is: a bunch of elements can be dragged and dropped anywhere,
// and nothing gets saved on purpose - every reload the page shakes itself
// and everything lands somewhere else, like a room that never stays tidy

// -- root config - which elements get hands on them, and how far they scatter --
const DRAG_TARGETS = [
	'.hero-icon',
	'.hero-title',
	'.hero-sub',
	'.hero-stamp',
	'.punk-btn',
	'.section-title',
	'.feature-chip',
	'.supporter',
	'.foot-star',
	'.faq-group',
	'.but',
];
const DRAG_SCATTER_X = 22;
const DRAG_SCATTER_Y = 20;
const DRAG_SCATTER_ROT = 5;
const DRAG_CLICK_LIMIT = 5;

// the element currently in hand, plus where the grab started
let held = null;
let grabX = 0;
let grabY = 0;
let baseX = 0;
let baseY = 0;
let itMoved = false;

// -- write the offset into css variables, drag.css does the actual moving --
function setOffset(el, x, y) {
	el.style.setProperty('--drag-x', x + 'px');
	el.style.setProperty('--drag-y', y + 'px');
	el.dataset.dragX = x;
	el.dataset.dragY = y;
}

// -- random number between -n and n, the chaos dice --
function scatterValue(n) {
	return (Math.random() * 2 - 1) * n;
}

// -- mark the targets and shake the page - new positions every load --
function scatterAll() {
	for (const selector of DRAG_TARGETS) {
		document.querySelectorAll(selector).forEach((el) => {
			el.setAttribute('data-drag', '');
			setOffset(el, Math.round(scatterValue(DRAG_SCATTER_X)), Math.round(scatterValue(DRAG_SCATTER_Y)));
			el.style.setProperty('--drag-rot', scatterValue(DRAG_SCATTER_ROT).toFixed(1) + 'deg');
		});
	}
}

// -- picking something up --
document.addEventListener('pointerdown', (e) => {
	const target = e.target.closest('[data-drag]');
	if (!target || e.button > 0) return;

	held = target;
	itMoved = false;
	grabX = e.clientX;
	grabY = e.clientY;
	baseX = Number(held.dataset.dragX) || 0;
	baseY = Number(held.dataset.dragY) || 0;
});

// -- carrying it around --
document.addEventListener('pointermove', (e) => {
	if (!held) return;

	const dx = e.clientX - grabX;
	const dy = e.clientY - grabY;

	// tiny wobbles still count as a click, real moves count as a drag
	if (Math.abs(dx) > DRAG_CLICK_LIMIT || Math.abs(dy) > DRAG_CLICK_LIMIT) {
		itMoved = true;
		held.classList.add('dragging');
	}

	if (itMoved) setOffset(held, baseX + dx, baseY + dy);
});

// -- letting go --
document.addEventListener('pointerup', () => {
	if (!held) return;

	held.classList.remove('dragging');

	// if it actually traveled, eat the click so links don't fire on drop
	if (itMoved) {
		document.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
		}, { capture: true, once: true });
	}

	held = null;
});

document.addEventListener('DOMContentLoaded', scatterAll);
