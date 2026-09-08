const timerElement = document.getElementById("timer");
const durationInMilliseconds = 5 * 60 * 1000;
const rulesModal = document.getElementById("rules-modal");
const startGameButton = document.getElementById("start-game");
const filmLink = document.querySelector(".film-link");
let startTime = null;
let gameStarted = false;
let popupOpen = false;
let lastScratchPoint = null;
let progressCheckFrame = null;

function updateTimer() {
	if (!gameStarted) {
		timerElement.textContent = "05:00:000";
		return true;
	}

	const elapsedTime = Date.now() - startTime;
	const remainingTime = Math.max(0, durationInMilliseconds - elapsedTime);
	const minutes = Math.floor(remainingTime / 60000);
	const seconds = Math.floor((remainingTime % 60000) / 1000);
	const milliseconds = remainingTime % 1000;

	timerElement.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(3, "0")}`;

	return remainingTime > 0;
}

updateTimer();

const timerInterval = setInterval(() => {
	if (!updateTimer()) {
		clearInterval(timerInterval);
	}
}, 10);

startGameButton.addEventListener("click", () => {
	startTime = Date.now();
	gameStarted = true;
	rulesModal.classList.add("is-closed");
	document.body.classList.remove("rules-open");
	schedulePopup(5000);
});

filmLink.addEventListener("click", () => {
	if (gameStarted) {
		document.body.classList.add("game-complete");
	}
});

const scratchLayer = document.createElement("canvas");
const scratchContext = scratchLayer.getContext("2d", { willReadFrequently: true });
const scratchRadius = 44;
const cinemaSection = document.querySelector(".cinema-section");
const faqSection = document.querySelector(".faq-container");
const cinemaClearThreshold = 0.94;
let cinemaSectionCleared = false;
let blockedPopup;
let galleryBlockedPopup;
let galleryComplete = false;
let openedFaqCount = 0;
let faqPenaltyApplied = false;
let faqPenaltyPopup;

scratchLayer.className = "scratch-layer";
document.body.appendChild(scratchLayer);

function resizeScratchLayer() {
	const pixelRatio = window.devicePixelRatio || 1;
	const pageWidth = document.documentElement.scrollWidth;
	const pageHeight = document.documentElement.scrollHeight;

	scratchLayer.width = pageWidth * pixelRatio;
	scratchLayer.height = pageHeight * pixelRatio;
	scratchLayer.style.width = `${pageWidth}px`;
	scratchLayer.style.height = `${pageHeight}px`;
	scratchContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	scratchContext.globalCompositeOperation = "source-over";
	scratchContext.fillStyle = "rgba(0, 0, 0, 0.97)";
	scratchContext.fillRect(0, 0, pageWidth, pageHeight);
}

function scratchAt(x, y) {
	if (!gameStarted || popupOpen) {
		return;
	}

	const light = scratchContext.createRadialGradient(
		x,
		y,
		0,
		x,
		y,
		scratchRadius
	);

	light.addColorStop(0, "rgba(0, 0, 0, 1)");
	light.addColorStop(0.72, "rgba(0, 0, 0, 0.85)");
	light.addColorStop(1, "rgba(0, 0, 0, 0)");

	scratchContext.globalCompositeOperation = "destination-out";
	scratchContext.fillStyle = light;
	scratchContext.beginPath();
	scratchContext.arc(x, y, scratchRadius, 0, Math.PI * 2);
	scratchContext.fill();
}

function scratchStroke(x, y) {
	if (!gameStarted || popupOpen) {
		return;
	}

	if (!lastScratchPoint) {
		scratchAt(x, y);
		lastScratchPoint = { x, y };
		return;
	}

	const distance = Math.hypot(x - lastScratchPoint.x, y - lastScratchPoint.y);
	const step = Math.max(8, scratchRadius / 3);
	const pointCount = Math.ceil(distance / step);

	for (let index = 1; index <= pointCount; index += 1) {
		const progress = index / pointCount;
		scratchAt(
			lastScratchPoint.x + (x - lastScratchPoint.x) * progress,
			lastScratchPoint.y + (y - lastScratchPoint.y) * progress
		);
	}

	lastScratchPoint = { x, y };
}

function getCinemaSectionBounds() {
	const sectionRect = cinemaSection.getBoundingClientRect();
	const pageWidth = document.documentElement.scrollWidth;
	const pageHeight = document.documentElement.scrollHeight;

	return {
		left: Math.max(0, Math.floor(sectionRect.left + window.scrollX)),
		top: Math.max(0, Math.floor(sectionRect.top + window.scrollY)),
		right: Math.min(pageWidth, Math.ceil(sectionRect.right + window.scrollX)),
		bottom: Math.min(pageHeight, Math.ceil(sectionRect.bottom + window.scrollY))
	};
}

function isCinemaSectionCleared() {
	const bounds = getCinemaSectionBounds();
	const sampleStep = 18;
	const pixelRatio = window.devicePixelRatio || 1;
	const width = Math.max(1, Math.ceil((bounds.right - bounds.left) * pixelRatio));
	const height = Math.max(1, Math.ceil((bounds.bottom - bounds.top) * pixelRatio));
	const pixels = scratchContext.getImageData(
		bounds.left * pixelRatio,
		bounds.top * pixelRatio,
		width,
		height
	).data;
	let totalSamples = 0;
	let clearedSamples = 0;

	for (let y = 0; y < height; y += sampleStep * pixelRatio) {
		for (let x = 0; x < width; x += sampleStep * pixelRatio) {
			const pixelIndex = (Math.floor(y) * width + Math.floor(x)) * 4;
			totalSamples += 1;

			if (pixels[pixelIndex + 3] < 64) {
				clearedSamples += 1;
			}
		}
	}

	return totalSamples > 0 && clearedSamples / totalSamples >= cinemaClearThreshold;
}

function showCinemaBlockedPopup() {
	if (blockedPopup) {
		return;
	}

	blockedPopup = document.createElement("div");
	blockedPopup.className = "cinema-blocked-popup";
	blockedPopup.innerHTML = "<div><strong>Section bloquée</strong><p>Gomme presque toute la section de la carte pour continuer.</p><button type=\"button\">J'ai compris</button></div>";
	document.body.appendChild(blockedPopup);
	document.body.classList.add("popup-open");
	blockedPopup.querySelector("button").addEventListener("click", () => {
		blockedPopup.remove();
		blockedPopup = null;
		document.body.classList.remove("popup-open");
	});
}

function showGalleryBlockedPopup() {
	if (galleryBlockedPopup) {
		return;
	}

	galleryBlockedPopup = document.createElement("div");
	galleryBlockedPopup.className = "cinema-blocked-popup";
	galleryBlockedPopup.innerHTML = "<div><strong>Galerie bloquée</strong><p>Parcours toutes les images du carrousel avant de continuer.</p><button type=\"button\">J'ai compris</button></div>";
	document.body.appendChild(galleryBlockedPopup);
	document.body.classList.add("popup-open");
	galleryBlockedPopup.querySelector("button").addEventListener("click", () => {
		galleryBlockedPopup.remove();
		galleryBlockedPopup = null;
		document.body.classList.remove("popup-open");
	});
}

function showFaqPenaltyPopup() {
	if (faqPenaltyPopup) {
		return;
	}

	faqPenaltyPopup = document.createElement("div");
	faqPenaltyPopup.className = "cinema-blocked-popup";
	faqPenaltyPopup.innerHTML = "<div><strong>Pénalité appliquée</strong><p>Tu as dépassé la FAQ sans avoir ouvert les quatre questions. 1 min 30 a été retirée du chrono.</p><button type=\"button\">J'ai compris</button></div>";
	document.body.appendChild(faqPenaltyPopup);
	document.body.classList.add("popup-open");
	faqPenaltyPopup.querySelector("button").addEventListener("click", () => {
		faqPenaltyPopup.remove();
		faqPenaltyPopup = null;
		document.body.classList.remove("popup-open");
	});
}

function updateCinemaProgress() {
	if (!cinemaSectionCleared && isCinemaSectionCleared()) {
		cinemaSectionCleared = true;
	}
}

function requestProgressCheck() {
	if (progressCheckFrame || popupOpen || cinemaSectionCleared) {
		return;
	}

	progressCheckFrame = requestAnimationFrame(() => {
		progressCheckFrame = null;
		updateCinemaProgress();
	});
}

resizeScratchLayer();
window.addEventListener("resize", resizeScratchLayer);
window.addEventListener("pointermove", (event) => {
	scratchStroke(event.clientX + window.scrollX, event.clientY + window.scrollY);
	requestProgressCheck();
});

function getCinemaScrollLimit() {
	const sectionRect = cinemaSection.getBoundingClientRect();
	return Math.max(0, sectionRect.top + window.scrollY + sectionRect.height - window.innerHeight);
}

function getGalleryScrollLimit() {
	const sectionRect = gallerySection.getBoundingClientRect();
	return Math.max(0, sectionRect.top + window.scrollY + sectionRect.height - window.innerHeight);
}

function getFaqScrollTrigger() {
	const sectionRect = faqSection.getBoundingClientRect();
	return Math.max(0, sectionRect.bottom + window.scrollY - window.innerHeight);
}

document.addEventListener("faq-opened", (event) => {
	openedFaqCount = event.detail.openedCount;
});

window.addEventListener("scroll", () => {
	if (!gameStarted || document.body.classList.contains("popup-open")) {
		return;
	}

	if (!cinemaSectionCleared) {
		const scrollLimit = getCinemaScrollLimit();
		if (window.scrollY > scrollLimit) {
			window.scrollTo(0, scrollLimit);
			showCinemaBlockedPopup();
			return;
		}
	}

	if (!galleryComplete) {
		const galleryScrollLimit = getGalleryScrollLimit();
		if (window.scrollY > galleryScrollLimit) {
			window.scrollTo(0, galleryScrollLimit);
			showGalleryBlockedPopup();
		}
	}

	if (!faqPenaltyApplied && openedFaqCount < 4 && window.scrollY > getFaqScrollTrigger()) {
		faqPenaltyApplied = true;
		startTime -= 90 * 1000;
		showFaqPenaltyPopup();
	}
});

const popupImages = [
	"cine.png",
	"coca.png",
	"cookies.png",
	"creative_cloud.png",
	"discord.png",
	"disney.png",
	"Group 16.png",
	"Group 17.png",
	"Group 18.png",
	"Group 19.png",
	"heineken.png",
	"mcdo.png",
	"miel_pops.png",
	"netflix.png",
	"x.png"
].sort(() => Math.random() - 0.5);
let popupIndex = 0;
let popupTimer;

const popupLayer = document.createElement("div");
popupLayer.className = "random-popup-layer";
popupLayer.innerHTML = "<img class=\"random-popup-image\" alt=\"Message\">";
document.body.appendChild(popupLayer);
const popupImage = popupLayer.querySelector(".random-popup-image");

function showNextPopup() {
	if (!gameStarted || popupIndex >= popupImages.length) {
		return;
	}

	popupOpen = true;
	lastScratchPoint = null;
	document.body.classList.add("popup-open");
	popupImage.src = `assets/images/popup/${encodeURIComponent(popupImages[popupIndex])}`;
	popupIndex += 1;
	popupLayer.classList.add("is-visible");
}

function schedulePopup(delay) {
	clearTimeout(popupTimer);
	popupTimer = setTimeout(showNextPopup, delay);
}

popupImage.addEventListener("click", () => {
	popupOpen = false;
	lastScratchPoint = null;
	popupLayer.classList.remove("is-visible");
	document.body.classList.remove("popup-open");

	if (popupIndex < popupImages.length) {
		const nextDelay = Math.random() < 0.3
			? 3000
			: 4500 + Math.random() * 1000;
		schedulePopup(nextDelay);
	}
});

const mapPreview = document.querySelector(".map-preview");
const mapInteractionButton = document.querySelector(".map-interaction-button");

mapInteractionButton.addEventListener("click", () => {
	mapPreview.classList.add("is-interactive");
});

const galleryImage = document.getElementById("gallery-image");
const gallerySection = document.querySelector(".gallery-section");
const galleryImages = [
	"assets/images/acteur_1.jpg",
	"assets/images/acteur_2.jpg",
	"assets/images/acteur_3.jpg",
	"assets/images/acteur_4.jpg",
	"assets/images/acteur_5.jpeg",
	"assets/images/acteur_6.jpg",
	"assets/images/affiche.jpg",
	"assets/images/affiche.jpg",
	"assets/images/jean.png",
	"assets/images/kev.jpg",
	"assets/images/matt.png",
  "assets/images/raphael.png",
	"assets/images/taylor.png",
	"assets/images/timothee.png",
	"assets/images/zin.png"
];
let galleryIndex = 0;
const galleryViewed = new Set([galleryIndex]);

function showGalleryImage(step) {
	galleryIndex = (galleryIndex + step + galleryImages.length) % galleryImages.length;
	galleryImage.src = galleryImages[galleryIndex];
	galleryViewed.add(galleryIndex);
	galleryComplete = galleryViewed.size === galleryImages.length;
}

document.querySelector(".gallery-arrow-left").addEventListener("click", () => {
	showGalleryImage(-1);
});

document.querySelector(".gallery-arrow-right").addEventListener("click", () => {
	showGalleryImage(1);
});

const makingOfPlayer = document.querySelector(".making-of-player");
const videoActivateButton = document.querySelector(".video-activate-button");

videoActivateButton.addEventListener("click", () => {
	makingOfPlayer.classList.add("is-video-active");
});
