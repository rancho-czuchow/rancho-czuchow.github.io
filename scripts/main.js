function getCookie(name) {
    const cookie = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith(`${name}=`));

    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

function setCookie(name, value, maxAge) {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
let themeURLS = {
    light: "/styles/themes/light.css",
    dark: "/styles/themes/dark.css",
    green: "/styles/themes/green.css",
};
let themeURLOrder = ["light", "dark", "green"];
let selectedTheme = null;
async function setTheme() {
    let themeStyleSheet = document.querySelector(".theme-style-sheet");
    if (selectedTheme) {
        setCookie("theme", selectedTheme, 307584000);
    } else {
        selectedTheme = "dark";
        let savedTheme = getCookie("theme");
        if (savedTheme) {
            selectedTheme = savedTheme;
        } else {
            if (window.matchMedia("(prefers-color-scheme: light)").matches) {
                selectedTheme = "light";
            }
        }
    }
    themeStyleSheet.href = themeURLS[selectedTheme];
}
setTheme();
let mainToolbarThemeButton = document.querySelector(
    ".main-toolbar .main-toolbar-button.theme",
);
function toggleTheme() {
    selectedTheme =
        themeURLOrder[themeURLOrder.indexOf(selectedTheme) + 1] ||
        themeURLOrder[0];
    setTheme();
}
mainToolbarThemeButton.addEventListener("click", toggleTheme);

let mainBackground = document.querySelector(".main-background");

if (mainBackground) {
    async function animateMainBackground() {
        const IMAGES_JSON = await fetch("/configs/background-images.json");
        if (!IMAGES_JSON.ok) {
            return;
        }
        const IMAGES = await IMAGES_JSON.json();
        if (!IMAGES) {
            return;
        }
        const IMAGE_CHANGE_COOLDOWN = IMAGES.imageChangeCooldown;
        if (!IMAGE_CHANGE_COOLDOWN) {
            return;
        }
        const IMAGE_PATH_PREFIX = "/images/gallery/";
        let backgroundImagesCache = [];
        async function loadImages(imageList) {
            const promises = imageList.map((imagePath) => {
                const imageLoader = new Image();
                backgroundImagesCache.push(imageLoader);
                return new Promise((resolve) => {
                    imageLoader.onload = () =>
                        resolve(IMAGE_PATH_PREFIX + imagePath);
                    imageLoader.onerror = () => resolve(null);
                    imageLoader.src = IMAGE_PATH_PREFIX + imagePath;
                });
            });

            const results = await Promise.all(promises);

            return results.filter((imagePath) => imagePath !== null);
        }

        let pcImages = await loadImages(IMAGES.pc);
        let mobileImages = await loadImages(IMAGES.mobile);

        let background = {
            pc: null,
            mobile: null,
        };
        let lastBackground = {
            pc: null,
            mobile: null,
        };
        async function changeBackground(animated) {
            mainBackground.style.setProperty(
                "--pc-image",
                `url("${background.pc}")`,
            );
            mainBackground.style.setProperty(
                "--mobile-image",
                `url("${background.mobile}")`,
            );
            mainBackground.style.setProperty(
                "--last-pc-image",
                `url("${lastBackground.pc}")`,
            );
            mainBackground.style.setProperty(
                "--last-mobile-image",
                `url("${lastBackground.mobile}")`,
            );
            if (animated) {
                let animationDuration = parseFloat(
                    getComputedStyle(mainBackground).getPropertyValue(
                        "--animation-duration",
                    ),
                );
                mainBackground.classList.add("animated");
                let ended = await new Promise((resolve) => {
                    setTimeout(() => {
                        mainBackground.classList.remove("animated");
                        resolve();
                    }, animationDuration);
                });
            }
        }

        function randomizeBackground() {
            const RANDOM = Math.random();
            lastBackground = { ...background };
            background.pc = pcImages[Math.floor(RANDOM * pcImages.length)];
            background.mobile =
                mobileImages[Math.floor(RANDOM * mobileImages.length)];
        }
        randomizeBackground();
        changeBackground(false);
        setInterval(() => {
            randomizeBackground();
            changeBackground(true);
        }, IMAGE_CHANGE_COOLDOWN);
    }
    animateMainBackground();
}
function toggleDocumentTopic(topic) {
    if (topic.classList.contains("hidden")) {
        topic.classList.remove("hidden");
    } else {
        topic.classList.add("hidden");
    }
}
document.querySelectorAll(".topic.collapsible").forEach((topic) => {
    let header = topic.querySelector("h1");
    header.addEventListener("click", () => {
        toggleDocumentTopic(topic);
    });
});
function imageViewing() {
    let viewingBox = document.createElement("div");
    viewingBox.classList.add("image-viewing");
    document.body.appendChild(viewingBox);
    let imageView = document.createElement("img");
    viewingBox.appendChild(imageView)
    function stopViewing() {
        viewingBox.classList.remove("viewing");
        imageView.src = "";
    }
    function view(image) {
        imageView.src = image.src;
        viewingBox.classList.add("viewing");
    }
    viewingBox.addEventListener("click", stopViewing);
    document.querySelectorAll("img.viewable").forEach((image) => {
        image.addEventListener("click", () => {
            view(image);
        })
    });
}
imageViewing();