// -- main.js - the little chaos engine for the landing page --
// nothing fancy in here, just wiring, all the actual looks live in the css

// -- star spray - click the big star and it spits tiny stars everywhere --
// each star is just a span with a css class, we only feed it random
// position/rotation through css variables and let spray.css do the rest

function sprayStars(x, y) {
	for (let i = 0; i < 12; i++) {
		const star = document.createElement('span');
		star.className = 'spray-star';
		star.textContent = '★';

		// random direction to fly off to, the css animation reads these
		star.style.setProperty('--sx', x + 'px');
		star.style.setProperty('--sy', y + 'px');
		star.style.setProperty('--dx', ((Math.random() - 0.5) * 300).toFixed(0) + 'px');
		star.style.setProperty('--dy', ((Math.random() - 0.5) * 300).toFixed(0) + 'px');
		star.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');

		document.body.appendChild(star);

		// clean up after the party, nobody likes leftover dom
		setTimeout(() => star.remove(), 900);
	}
}

document.addEventListener('click', (e) => {
	const target = e.target.closest('[data-spray]');
	if (!target) return;
	sprayStars(e.clientX, e.clientY);
});

// -- shots strip - the scroll wheel moves it sideways --
// vertical wheel spins become horizontal travel while you're over the strip,
// and once you hit either end the page just scrolls on like normal
document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('.shots').forEach((strip) => {
		strip.addEventListener('wheel', (e) => {
			if (e.deltaY === 0) return;

			// while you're over the strip, the wheel belongs to the strip -
			// the page stays put, no sneaky double scrolling
			e.preventDefault();
			strip.scrollLeft += e.deltaY;
		}, { passive: false });
	});
});

// -- fake ticker - repeat the tape text until it covers the whole screen --
// the animation slides to -50%, so we need an even number of copies wide
// enough to fill twice the tape, then the loop seam is invisible
// wait for the pixel font too, it changes the text width when it lands
document.addEventListener('DOMContentLoaded', async () => {
	await document.fonts.ready;

	document.querySelectorAll('.tape .tape-inner').forEach((inner) => {
		const chunk = inner.innerHTML;
		const chunkWidth = inner.scrollWidth;
		const tapeWidth = inner.parentElement.offsetWidth;

		// how many copies to cover the tape twice, bumped to even so -50% lands clean
		let copies = Math.ceil((tapeWidth * 2) / chunkWidth) + 1;
		if (copies % 2 !== 0) copies++;

		inner.innerHTML = chunk.repeat(copies);
	});
});
