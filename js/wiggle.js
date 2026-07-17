// -- wiggle.js - chops text into letters and makes them misbehave --
// so basically any element with [data-wiggle] gets its text split into
// spans, and each letter randomly grabs one of the wiggle classes from
// main.css - no smooth stuff, everything snaps frame by frame

const WIGGLE_CLASSES = ['w-a', 'w-b', 'w-c'];

// -- split one element into wiggling letters --
function wiggleElement(el) {
	const text = el.textContent;
	el.textContent = '';
	el.setAttribute('aria-label', text);

	for (const letter of text) {
		const span = document.createElement('span');
		span.textContent = letter;
		span.setAttribute('aria-hidden', 'true');

		// spaces just sit there, they earned the rest
		if (letter.trim() !== '') {
			span.className = 'w ' + WIGGLE_CLASSES[Math.floor(Math.random() * WIGGLE_CLASSES.length)];

			// random delay so the letters don't dance in sync, that would be cute and we don't do cute
			span.style.setProperty('--w-delay', (Math.random() * -2).toFixed(2) + 's');
		}

		el.appendChild(span);
	}
}

// -- run it on everything marked for chaos --
function wiggleAll() {
	document.querySelectorAll('[data-wiggle]').forEach(wiggleElement);
}

document.addEventListener('DOMContentLoaded', wiggleAll);
