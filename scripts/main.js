let themeURLS = {
    light: "/styles/themes/light.css",
    dark: "/styles/themes/dark.css",
};
let themeURLOrder = ["light", "dark"];
let selectedTheme = null;
async function setTheme() {
    let themeStyleSheet = document.querySelector(".theme-style-sheet");
    if (selectedTheme) {
        await cookieStore.set({
            name: "theme",
            value: selectedTheme,
            path: "/",
            expires: Date.now() + 30758400000,
        });
    } else {
        selectedTheme = "dark";
        let savedTheme = await cookieStore.get("theme");
        if (savedTheme) {
            selectedTheme = savedTheme.value;
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
    async function startAnimatingBackground() {
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

        async function loadImages(imageList) {
            let loadedList = new Array();
            if (imageList) {
                let imageLoader = new Image();
                for (imageName of imageList) {
                    let loadSuccessfull = true;
                    let path = IMAGE_PATH_PREFIX + imageName;
                    imageLoader.src = path;
                    try {
                        await imageLoader.decode();
                    } catch (error) {
                        loadSuccessfull = false;
                    }
                    if (loadSuccessfull) {
                        loadedList.push(path);
                    }
                }
            }
            return loadedList;
        }

        let pcImages = await loadImages(IMAGES.pc);

        let mobileImages = await loadImages(IMAGES.mobile);

        async function changeBackground(animated) {
            const RANDOM = Math.random();
            let pcImage = pcImages[Math.floor(RANDOM * pcImages.length)];
            let mobileImage =
                mobileImages[Math.floor(RANDOM * mobileImages.length)];

            if (window.matchMedia("(orientation: portrait)").matches) {
                document.documentElement.style.setProperty(
                    "--last-main-background",
                    getComputedStyle(document.documentElement).getPropertyValue(
                        "--main-background-mobile",
                    ),
                );
            } else {
                document.documentElement.style.setProperty(
                    "--last-main-background",
                    getComputedStyle(document.documentElement).getPropertyValue(
                        "--main-background-pc",
                    ),
                );
            }

            document.documentElement.style.setProperty(
                "--main-background-pc",
                `url("${pcImage}")`,
            );

            document.documentElement.style.setProperty(
                "--main-background-mobile",
                `url("${mobileImage}")`,
            );
            if (animated) {
                let animationDuration = parseFloat(
                    getComputedStyle(document.documentElement).getPropertyValue(
                        "--main-background-animation-duration",
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
        changeBackground(false);
        setInterval(() => {
            changeBackground(true);
        }, IMAGE_CHANGE_COOLDOWN);
    }
    startAnimatingBackground();
}