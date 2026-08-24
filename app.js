(() => {
    "use strict";

    const LINE_TWO_GREEN = "#8DBB14";
    const DIRECTION_BAND_RED = "#E2001A";
    const FONT_CURRENT_CHINESE = "'Dream Han Sans W26', 'Microsoft YaHei', 'PingFang SC', sans-serif";
    const FONT_SIDE_CHINESE = "'Dream Han Sans W18', 'Microsoft YaHei', 'PingFang SC', sans-serif";
    const FONT_JAPANESE = "'Yu Gothic', 'Hiragino Sans', 'Meiryo', sans-serif";
    const FONT_KOREAN = "'Malgun Gothic', 'Noto Sans KR', sans-serif";
    const FONT_LATIN = "'Arial', sans-serif";
    const FONT_TLC = "'Frutiger LT 65 Bold', 'Arial', sans-serif";
    const STORAGE_KEY = "jrChineseSignGeneratorVisualV2";
    const LEGACY_STORAGE_KEY = "jrChineseSignGeneratorVisualV1";
    const SIDEBAR_PREFERENCE_KEY = "jrChineseSignGeneratorSidebarPinned";

    const FRAMES = {
        "SE-6": { width: 1830, height: 490, padding: { top: 80, right: 35, bottom: 30, left: 35 } },
        "SE-7": { width: 2410, height: 490, padding: { top: 80, right: 35, bottom: 30, left: 35 } },
        "SE-8": { width: 3620, height: 490, padding: { top: 80, right: 40, bottom: 30, left: 40 } },
        "RATIO-3-1": { width: 1730, height: 490, padding: { top: 80, right: 35, bottom: 30, left: 35 } },
        "RATIO-4-1": { width: 2330, height: 490, padding: { top: 80, right: 35, bottom: 30, left: 35 } },
        "RATIO-5-1": { width: 2930, height: 490, padding: { top: 80, right: 35, bottom: 30, left: 35 } },
        "RATIO-6-1": { width: 3530, height: 490, padding: { top: 80, right: 35, bottom: 30, left: 35 } }
    };

    const defaultState = () => ({
        board: { type: "SE-6", light: true },
        showNumbering: true,
        showLanguages: true,
        showCityMarks: true,
        branchLeft: false,
        branchRight: false,
        spurLeft: false,
        spurRight: false,
        black: "#1A1A1A",
        current: {
            chinese: "人民广场",
            zhuyin: "ㄖㄣˊ ㄇㄧㄣˊ ㄍㄨㄤˇ ㄔㄤˇ",
            english: "People's Square",
            japanese: "人民広場",
            korean: "런민광창",
            showTlc: true,
            tlc: "RMG",
            numberings: [{ route: "2", number: "12", color: LINE_TWO_GREEN }]
        },
        leftStations: [
            {
                chinese: "南京西路",
                english: "Nanjing Rd.(W)",
                lineColor: DIRECTION_BAND_RED,
                go: false,
                numberings: [{ route: "2", number: "11", color: LINE_TWO_GREEN }]
            },
            { chinese: "", english: "", lineColor: DIRECTION_BAND_RED, go: false, numberings: [] }
        ],
        rightStations: [
            {
                chinese: "南京东路",
                english: "Nanjing Rd.(E)",
                lineColor: DIRECTION_BAND_RED,
                go: true,
                numberings: [{ route: "2", number: "13", color: LINE_TWO_GREEN }]
            },
            { chinese: "", english: "", lineColor: DIRECTION_BAND_RED, go: false, numberings: [] }
        ],
        cityMarks: [
            { text: "沪", fill: false }
        ],
        routeColors: [LINE_TWO_GREEN]
    });

    const form = document.getElementById("generatorForm");
    const canvas = document.getElementById("signCanvas");
    const stage = document.querySelector(".canvas-stage");
    const canvasWrap = document.getElementById("canvasWrap");
    const validationMessage = document.getElementById("validationMessage");
    const editorWorkspace = document.getElementById("editorWorkspace");
    const inspectorPanel = document.getElementById("inspectorPanel");
    const inspectorTitle = document.getElementById("inspectorTitle");
    const showInspectorButton = document.getElementById("showInspectorButton");
    const pinInspectorButton = document.getElementById("pinInspectorButton");
    const compactInspectorMedia = window.matchMedia("(max-width: 900px)");
    let state = loadInitialState();
    let renderTimer = 0;
    let activeInspector = "current";
    let inspectorPinned = localStorage.getItem(SIDEBAR_PREFERENCE_KEY) !== "false";

    function mergeState(value) {
        const fallback = defaultState();
        if (!value || typeof value !== "object") return fallback;
        const legacyVisibility = typeof value.showMultilingual === "boolean" ? value.showMultilingual : true;
        return {
            ...fallback,
            ...value,
            showNumbering: typeof value.showNumbering === "boolean" ? value.showNumbering : legacyVisibility,
            showLanguages: typeof value.showLanguages === "boolean" ? value.showLanguages : legacyVisibility,
            showCityMarks: typeof value.showCityMarks === "boolean" ? value.showCityMarks : true,
            board: { ...fallback.board, ...(value.board || {}) },
            current: { ...fallback.current, ...(value.current || {}) },
            leftStations: fallback.leftStations.map((station, index) => ({
                ...station,
                ...(value.leftStations?.[index] || {}),
                english: index === 0 && value.leftStations?.[index]?.english === "West Nanjing Road"
                    ? station.english
                    : (value.leftStations?.[index]?.english ?? station.english),
                numberings: Array.isArray(value.leftStations?.[index]?.numberings) ? value.leftStations[index].numberings : station.numberings
            })),
            rightStations: fallback.rightStations.map((station, index) => ({
                ...station,
                ...(value.rightStations?.[index] || {}),
                english: index === 0 && value.rightStations?.[index]?.english === "East Nanjing Road"
                    ? station.english
                    : (value.rightStations?.[index]?.english ?? station.english),
                numberings: Array.isArray(value.rightStations?.[index]?.numberings) ? value.rightStations[index].numberings : station.numberings
            })),
            cityMarks: Array.isArray(value.cityMarks) ? value.cityMarks : fallback.cityMarks,
            routeColors: Array.isArray(value.routeColors) && value.routeColors.length ? value.routeColors : fallback.routeColors
        };
    }

    function loadInitialState() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
            return stored ? mergeState(JSON.parse(stored)) : defaultState();
        } catch (error) {
            console.warn("无法恢复保存的数据，已使用默认设置。", error);
            return defaultState();
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn("无法保存当前设置。", error);
        }
    }

    function pathParts(path) {
        return path.split(".").map(part => /^\d+$/.test(part) ? Number(part) : part);
    }

    function getPath(path) {
        return pathParts(path).reduce((value, key) => value?.[key], state);
    }

    function setPath(path, value) {
        const parts = pathParts(path);
        const finalKey = parts.pop();
        const target = parts.reduce((item, key) => item[key], state);
        target[finalKey] = value;
    }

    function clamp(value, minimum, maximum) {
        const number = Number(value);
        return Math.min(maximum, Math.max(minimum, Number.isFinite(number) ? number : minimum));
    }

    function normalizeHex(value) {
        const match = String(value || "").trim().match(/^#?([0-9a-f]{6})$/i);
        return match ? `#${match[1].toUpperCase()}` : null;
    }

    function hexToRgb(hex) {
        const normalized = normalizeHex(hex) || "#000000";
        return {
            r: parseInt(normalized.slice(1, 3), 16),
            g: parseInt(normalized.slice(3, 5), 16),
            b: parseInt(normalized.slice(5, 7), 16)
        };
    }

    function rgbToHex(red, green, blue) {
        return `#${[red, green, blue].map(value => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    }

    function rgbToCmyk({ r, g, b }) {
        const red = r / 255;
        const green = g / 255;
        const blue = b / 255;
        const k = 1 - Math.max(red, green, blue);
        if (k >= .9999) return { c: 0, m: 0, y: 0, k: 100 };
        return {
            c: Math.round(((1 - red - k) / (1 - k)) * 100),
            m: Math.round(((1 - green - k) / (1 - k)) * 100),
            y: Math.round(((1 - blue - k) / (1 - k)) * 100),
            k: Math.round(k * 100)
        };
    }

    function cmykToHex(cyan, magenta, yellow, black) {
        const c = clamp(cyan, 0, 100) / 100;
        const m = clamp(magenta, 0, 100) / 100;
        const y = clamp(yellow, 0, 100) / 100;
        const k = clamp(black, 0, 100) / 100;
        return rgbToHex(255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k));
    }

    function rgbToHsv({ r, g, b }) {
        const red = r / 255;
        const green = g / 255;
        const blue = b / 255;
        const maximum = Math.max(red, green, blue);
        const minimum = Math.min(red, green, blue);
        const delta = maximum - minimum;
        let hue = 0;
        if (delta > 0) {
            if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
            else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
            else hue = 60 * ((red - green) / delta + 4);
        }
        if (hue < 0) hue += 360;
        return {
            h: hue,
            s: maximum === 0 ? 0 : (delta / maximum) * 100,
            v: maximum * 100
        };
    }

    function hsvToHex(hue, saturation, value) {
        const h = ((clamp(hue, 0, 360) % 360) + 360) % 360;
        const s = clamp(saturation, 0, 100) / 100;
        const v = clamp(value, 0, 100) / 100;
        const chroma = v * s;
        const segment = h / 60;
        const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
        const offset = v - chroma;
        let red = 0;
        let green = 0;
        let blue = 0;
        if (segment < 1) [red, green] = [chroma, secondary];
        else if (segment < 2) [red, green] = [secondary, chroma];
        else if (segment < 3) [green, blue] = [chroma, secondary];
        else if (segment < 4) [green, blue] = [secondary, chroma];
        else if (segment < 5) [red, blue] = [secondary, chroma];
        else [red, blue] = [chroma, secondary];
        return rgbToHex((red + offset) * 255, (green + offset) * 255, (blue + offset) * 255);
    }

    function closeColorEditors(except = null) {
        document.querySelectorAll(".color-editor.open").forEach(editor => {
            if (editor === except) return;
            editor.classList.remove("open");
            editor.classList.remove("open-above");
            const trigger = editor.querySelector(".color-trigger");
            const popover = editor.querySelector(".color-popover");
            if (trigger) trigger.setAttribute("aria-expanded", "false");
            if (popover) popover.hidden = true;
        });
    }

    function positionColorPopover(editor, popover) {
        editor.classList.remove("open-above");
        popover.style.removeProperty("top");
        popover.style.removeProperty("left");
        if (window.matchMedia("(max-width: 620px)").matches) return;
        const margin = 10;
        const gap = 8;
        const boundary = editor.closest(".inspector-panel")?.getBoundingClientRect()
            || { top: 0, right: window.innerWidth, bottom: window.innerHeight, left: 0 };
        const editorRect = editor.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const minimumLeft = Math.max(margin, boundary.left + margin);
        const maximumLeft = Math.max(minimumLeft, Math.min(window.innerWidth - popoverRect.width - margin, boundary.right - popoverRect.width - margin));
        const left = clamp(editorRect.right - popoverRect.width, minimumLeft, maximumLeft);
        const minimumTop = Math.max(margin, boundary.top + margin);
        const maximumBottom = Math.min(window.innerHeight - margin, boundary.bottom - margin);
        const below = editorRect.bottom + gap;
        const above = editorRect.top - popoverRect.height - gap;
        const openAbove = below + popoverRect.height > maximumBottom && above >= minimumTop;
        const top = openAbove
            ? above
            : clamp(below, minimumTop, Math.max(minimumTop, maximumBottom - popoverRect.height));
        editor.classList.toggle("open-above", openAbove);
        popover.style.left = `${Math.round(left)}px`;
        popover.style.top = `${Math.round(top)}px`;
    }

    function syncColorEditor(editor, value) {
        if (!editor) return;
        const hex = normalizeHex(value) || "#000000";
        const rgb = hexToRgb(hex);
        const cmyk = rgbToCmyk(rgb);
        const hsv = rgbToHsv(rgb);
        const swatch = editor.querySelector(".color-swatch");
        const summary = editor.querySelector(".color-trigger-value");
        const hexInput = editor.querySelector("[data-color-hex]");
        if (swatch) swatch.style.backgroundColor = hex;
        if (summary) summary.textContent = hex;
        if (hexInput) hexInput.value = hex;
        const hueInput = editor.querySelector("[data-color-hue]");
        const saturationValue = editor.querySelector("[data-color-sv]");
        const pickerCursor = editor.querySelector(".color-picker-cursor");
        const existingHue = Number(hueInput?.value);
        const pickerHue = hsv.s < .01 && Number.isFinite(existingHue) ? existingHue : hsv.h;
        if (hueInput) hueInput.value = Math.round(pickerHue);
        if (saturationValue) {
            saturationValue.dataset.saturation = String(hsv.s);
            saturationValue.dataset.value = String(hsv.v);
            saturationValue.style.setProperty("--picker-hue", String(pickerHue));
        }
        if (pickerCursor) {
            pickerCursor.style.left = `${hsv.s}%`;
            pickerCursor.style.top = `${100 - hsv.v}%`;
        }
        Object.entries(rgb).forEach(([channel, channelValue]) => {
            const input = editor.querySelector(`[data-color-rgb="${channel}"]`);
            if (input) input.value = channelValue;
        });
        Object.entries(cmyk).forEach(([channel, channelValue]) => {
            const input = editor.querySelector(`[data-color-cmyk="${channel}"]`);
            if (input) input.value = channelValue;
        });
    }

    function applyEditorColor(editor, value) {
        const colorInput = editor.querySelector('input[type="color"]');
        const hex = normalizeHex(value);
        if (!colorInput || !hex) return;
        colorInput.value = hex;
        syncColorEditor(editor, hex);
        colorInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function createChannelInput(group, channel, maximum) {
        const label = document.createElement("label");
        label.className = "color-channel";
        const name = document.createElement("span");
        name.textContent = channel.toUpperCase();
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = String(maximum);
        input.step = "1";
        input.inputMode = "numeric";
        input.dataset[group] = channel;
        label.append(name, input);
        return label;
    }

    function enhanceColorInputs(root = document) {
        root.querySelectorAll('input[type="color"]:not([data-color-enhanced])').forEach(colorInput => {
            colorInput.dataset.colorEnhanced = "true";
            const editor = document.createElement("div");
            editor.className = "color-editor";
            colorInput.parentNode.insertBefore(editor, colorInput);

            const trigger = document.createElement("button");
            trigger.type = "button";
            trigger.className = "color-trigger";
            trigger.setAttribute("aria-expanded", "false");
            trigger.setAttribute("aria-label", colorInput.getAttribute("aria-label") || "编辑颜色");
            const swatch = document.createElement("span");
            swatch.className = "color-swatch";
            const summary = document.createElement("span");
            summary.className = "color-trigger-value";
            trigger.append(swatch, summary);

            const popover = document.createElement("div");
            popover.className = "color-popover";
            popover.hidden = true;

            const pickerRow = document.createElement("div");
            pickerRow.className = "color-picker-row";
            const pickerName = document.createElement("span");
            pickerName.textContent = "取色";
            const visualPicker = document.createElement("div");
            visualPicker.className = "color-visual-picker";
            const saturationValue = document.createElement("button");
            saturationValue.type = "button";
            saturationValue.className = "color-saturation-value";
            saturationValue.dataset.colorSv = "true";
            saturationValue.setAttribute("aria-label", "选择颜色饱和度与明度");
            const pickerCursor = document.createElement("span");
            pickerCursor.className = "color-picker-cursor";
            saturationValue.append(pickerCursor);
            const hueInput = document.createElement("input");
            hueInput.type = "range";
            hueInput.min = "0";
            hueInput.max = "360";
            hueInput.step = "1";
            hueInput.dataset.colorHue = "true";
            hueInput.setAttribute("aria-label", "色相");
            visualPicker.append(saturationValue, hueInput);
            pickerRow.append(pickerName, visualPicker);

            const hexRow = document.createElement("label");
            hexRow.className = "color-format-row";
            const hexName = document.createElement("span");
            hexName.textContent = "HEX";
            const hexInput = document.createElement("input");
            hexInput.type = "text";
            hexInput.maxLength = 7;
            hexInput.spellcheck = false;
            hexInput.dataset.colorHex = "true";
            hexRow.append(hexName, hexInput);

            const rgbRow = document.createElement("div");
            rgbRow.className = "color-format-row color-channel-row";
            const rgbName = document.createElement("span");
            rgbName.textContent = "RGB";
            const rgbChannels = document.createElement("div");
            rgbChannels.className = "color-channels rgb-channels";
            ["r", "g", "b"].forEach(channel => rgbChannels.append(createChannelInput("colorRgb", channel, 255)));
            rgbRow.append(rgbName, rgbChannels);

            const cmykRow = document.createElement("div");
            cmykRow.className = "color-format-row color-channel-row";
            const cmykName = document.createElement("span");
            cmykName.textContent = "CMYK";
            const cmykChannels = document.createElement("div");
            cmykChannels.className = "color-channels cmyk-channels";
            ["c", "m", "y", "k"].forEach(channel => cmykChannels.append(createChannelInput("colorCmyk", channel, 100)));
            cmykRow.append(cmykName, cmykChannels);

            popover.append(pickerRow, hexRow, rgbRow, cmykRow);
            colorInput.classList.add("native-color-input");
            colorInput.hidden = true;
            colorInput.tabIndex = -1;
            colorInput.setAttribute("aria-hidden", "true");
            editor.append(trigger, popover, colorInput);
            syncColorEditor(editor, colorInput.value);

            let activePickerPointer = null;
            const updateSaturationValue = event => {
                const rect = saturationValue.getBoundingClientRect();
                const saturation = clamp((event.clientX - rect.left) / rect.width * 100, 0, 100);
                const value = clamp((rect.bottom - event.clientY) / rect.height * 100, 0, 100);
                applyEditorColor(editor, hsvToHex(hueInput.value, saturation, value));
            };
            saturationValue.addEventListener("pointerdown", event => {
                event.preventDefault();
                activePickerPointer = event.pointerId;
                saturationValue.setPointerCapture?.(event.pointerId);
                updateSaturationValue(event);
            });
            saturationValue.addEventListener("pointermove", event => {
                if (event.pointerId === activePickerPointer) updateSaturationValue(event);
            });
            const finishPickerPointer = event => {
                if (event.pointerId === activePickerPointer) activePickerPointer = null;
            };
            saturationValue.addEventListener("pointerup", finishPickerPointer);
            saturationValue.addEventListener("pointercancel", finishPickerPointer);

            trigger.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                const willOpen = !editor.classList.contains("open");
                closeColorEditors(editor);
                editor.classList.toggle("open", willOpen);
                trigger.setAttribute("aria-expanded", String(willOpen));
                popover.hidden = !willOpen;
                if (willOpen) {
                    positionColorPopover(editor, popover);
                    hexInput.focus();
                } else {
                    editor.classList.remove("open-above");
                }
            });
            colorInput.addEventListener("input", () => syncColorEditor(editor, colorInput.value));
            editor.addEventListener("input", event => {
                const target = event.target;
                if (target.dataset.colorHex !== undefined) {
                    event.stopPropagation();
                    const hex = normalizeHex(target.value);
                    if (hex) applyEditorColor(editor, hex);
                } else if (target.dataset.colorRgb !== undefined) {
                    event.stopPropagation();
                    const channels = ["r", "g", "b"].map(channel => editor.querySelector(`[data-color-rgb="${channel}"]`).value);
                    if (channels.every(value => value !== "")) applyEditorColor(editor, rgbToHex(...channels));
                } else if (target.dataset.colorCmyk !== undefined) {
                    event.stopPropagation();
                    const channels = ["c", "m", "y", "k"].map(channel => editor.querySelector(`[data-color-cmyk="${channel}"]`).value);
                    if (channels.every(value => value !== "")) applyEditorColor(editor, cmykToHex(...channels));
                } else if (target.dataset.colorHue !== undefined) {
                    event.stopPropagation();
                    applyEditorColor(
                        editor,
                        hsvToHex(target.value, saturationValue.dataset.saturation, saturationValue.dataset.value)
                    );
                }
            });
        });
    }

    function setFieldValue(field, value) {
        if (field.type === "checkbox") field.checked = Boolean(value);
        else field.value = value ?? "";
        if (field.type === "color") syncColorEditor(field.closest(".color-editor"), field.value);
    }

    function syncBoundPeers(path, source) {
        form.querySelectorAll("[data-bind]").forEach(field => {
            if (field !== source && field.dataset.bind === path) setFieldValue(field, getPath(path));
        });
    }

    function syncBoundFields() {
        form.querySelectorAll("[data-bind]").forEach(field => {
            const value = getPath(field.dataset.bind);
            setFieldValue(field, value);
        });
        renderDynamicControls();
        enhanceColorInputs(form);
        updateVisibility();
    }

    function updateVisibility() {
        document.querySelectorAll("[data-language-section]").forEach(element => {
            element.hidden = !state.showLanguages;
        });
        document.querySelectorAll("[data-numbering-section]").forEach(element => {
            element.hidden = !state.showNumbering;
        });
        document.querySelectorAll("[data-tlc-section]").forEach(element => {
            element.hidden = !state.current.showTlc;
        });
        document.querySelectorAll("[data-mark-section]").forEach(element => {
            element.hidden = !state.showCityMarks;
        });
        document.querySelectorAll("[data-branch-section]").forEach(element => {
            const side = element.dataset.branchSection;
            element.hidden = side === "left"
                ? !(state.branchLeft || state.spurLeft)
                : !(state.branchRight || state.spurRight);
        });
        document.querySelectorAll("[data-station-numberings]").forEach(element => {
            const station = getPath(element.dataset.stationNumberings);
            element.hidden = !state.showNumbering || !station.go;
        });
    }

    function createButton(label, className, attributes = {}) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = label;
        Object.entries(attributes).forEach(([name, value]) => button.dataset[name] = value);
        return button;
    }

    function renderNumberingLists() {
        document.querySelectorAll("[data-numbering-list]").forEach(container => {
            const path = container.dataset.numberingList;
            const numberings = getPath(path);
            container.replaceChildren();
            numberings.forEach((numbering, index) => {
                const row = document.createElement("div");
                row.className = "repeat-row";

                const label = document.createElement("span");
                label.className = "row-label";
                label.textContent = `编号 ${index + 1}`;

                const routeInput = document.createElement("input");
                routeInput.type = "text";
                routeInput.className = "route-input";
                routeInput.value = numbering.route;
                routeInput.placeholder = "线路";
                routeInput.required = true;
                routeInput.setAttribute("aria-label", `线路缩写 ${index + 1}`);
                routeInput.dataset.listPath = path;
                routeInput.dataset.listIndex = index;
                routeInput.dataset.listKey = "route";

                const numberInput = document.createElement("input");
                numberInput.type = "text";
                numberInput.className = "station-number-input";
                numberInput.value = numbering.number;
                numberInput.placeholder = "编号";
                numberInput.pattern = "^[0-9]{2,}$";
                numberInput.inputMode = "numeric";
                numberInput.setAttribute("aria-label", `车站编号 ${index + 1}`);
                numberInput.dataset.listPath = path;
                numberInput.dataset.listIndex = index;
                numberInput.dataset.listKey = "number";

                const colorInput = document.createElement("input");
                colorInput.type = "color";
                colorInput.value = numbering.color;
                colorInput.setAttribute("aria-label", `编号颜色 ${index + 1}`);
                colorInput.dataset.listPath = path;
                colorInput.dataset.listIndex = index;
                colorInput.dataset.listKey = "color";

                const spacer = document.createElement("span");
                spacer.className = "row-spacer";
                const remove = createButton("×", "icon-button", { removeNumbering: path, removeIndex: index });
                remove.setAttribute("aria-label", `删除编号 ${index + 1}`);
                remove.disabled = path === "current.numberings" && state.current.showTlc && numberings.length <= 1;
                row.append(label, routeInput, numberInput, colorInput, spacer, remove);
                container.append(row);
            });
            enhanceColorInputs(container);
        });
    }

    function renderMarks() {
        const container = document.getElementById("markList");
        container.replaceChildren();
        state.cityMarks.forEach((mark, index) => {
            const row = document.createElement("div");
            row.className = "repeat-row";

            const label = document.createElement("span");
            label.className = "row-label";
            label.textContent = `文字 ${index + 1}`;

            const textInput = document.createElement("input");
            textInput.type = "text";
            textInput.className = "short-input";
            textInput.value = mark.text;
            textInput.maxLength = 1;
            textInput.required = true;
            textInput.setAttribute("aria-label", `城市标记 ${index + 1}`);
            textInput.dataset.markIndex = index;
            textInput.dataset.markKey = "text";

            const fillLabel = document.createElement("label");
            fillLabel.className = "toggle-field toggle-field-inline";
            const fillInput = document.createElement("input");
            fillInput.type = "checkbox";
            fillInput.checked = mark.fill;
            fillInput.dataset.markIndex = index;
            fillInput.dataset.markKey = "fill";
            const fillText = document.createElement("span");
            fillText.textContent = "实心";
            const fillIndicator = document.createElement("i");
            fillLabel.append(fillText, fillInput, fillIndicator);

            const spacer = document.createElement("span");
            spacer.className = "row-spacer";
            const remove = createButton("×", "icon-button", { removeMark: index });
            remove.setAttribute("aria-label", `删除城市标记 ${index + 1}`);
            row.append(label, textInput, fillLabel, spacer, remove);
            container.append(row);
        });
    }

    function renderRouteColors() {
        const container = document.getElementById("routeColorList");
        container.replaceChildren();
        state.routeColors.forEach((color, index) => {
            const row = document.createElement("div");
            row.className = "repeat-row";
            const label = document.createElement("span");
            label.className = "row-label";
            label.textContent = `线路${index + 1}`;
            const input = document.createElement("input");
            input.type = "color";
            input.value = color;
            input.setAttribute("aria-label", `中央线路色 ${index + 1}`);
            input.dataset.routeIndex = index;
            const spacer = document.createElement("span");
            spacer.className = "row-spacer";
            const remove = createButton("×", "icon-button", { removeRoute: index });
            remove.disabled = state.routeColors.length <= 1;
            remove.setAttribute("aria-label", `删除线路色 ${index + 1}`);
            row.append(label, input, spacer, remove);
            container.append(row);
        });
        enhanceColorInputs(container);
    }

    function renderDynamicControls() {
        renderNumberingLists();
        renderMarks();
        renderRouteColors();
    }

    function roundRectPath(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }

    function drawFrame(ctx, frame, data) {
        const { width, height, padding } = frame;
        const fullWidth = width + padding.left + padding.right;
        const fullHeight = height + padding.top + padding.bottom;

        const metal = ctx.createLinearGradient(0, 0, 0, fullHeight);
        metal.addColorStop(0, "#4a4a4a");
        metal.addColorStop(.15, "#262626");
        metal.addColorStop(.85, "#333333");
        metal.addColorStop(1, "#151515");
        ctx.fillStyle = metal;
        ctx.fillRect(0, 0, fullWidth, fullHeight);

        ctx.strokeStyle = "#0a0a0a";
        ctx.lineWidth = 3;
        ctx.strokeRect(7, 7, fullWidth - 14, fullHeight - 8);
        ctx.strokeStyle = "rgba(255,255,255,.22)";
        ctx.lineWidth = 1;
        ctx.strokeRect(12, 12, fullWidth - 24, fullHeight - 24);

        ctx.fillStyle = data.board.light ? "#F6FBFF" : "#EFEFEF";
        ctx.fillRect(padding.left, padding.top, width, height);
        if (data.board.light) {
            const glow = ctx.createLinearGradient(0, padding.top, 0, padding.top + height);
            glow.addColorStop(0, "rgba(255,255,255,.55)");
            glow.addColorStop(.5, "rgba(186,220,240,.07)");
            glow.addColorStop(1, "rgba(95,130,150,.13)");
            ctx.fillStyle = glow;
            ctx.fillRect(padding.left, padding.top, width, height);

            const sideDepth = Math.min(82, width * .055);
            const topDepth = Math.min(62, height * .15);
            const bottomDepth = Math.min(72, height * .17);
            const leftShade = ctx.createLinearGradient(padding.left, 0, padding.left + sideDepth, 0);
            leftShade.addColorStop(0, "rgba(18,32,38,.13)");
            leftShade.addColorStop(1, "rgba(18,32,38,0)");
            ctx.fillStyle = leftShade;
            ctx.fillRect(padding.left, padding.top, sideDepth, height);
            const rightShade = ctx.createLinearGradient(padding.left + width, 0, padding.left + width - sideDepth, 0);
            rightShade.addColorStop(0, "rgba(18,32,38,.13)");
            rightShade.addColorStop(1, "rgba(18,32,38,0)");
            ctx.fillStyle = rightShade;
            ctx.fillRect(padding.left + width - sideDepth, padding.top, sideDepth, height);
            const topShade = ctx.createLinearGradient(0, padding.top, 0, padding.top + topDepth);
            topShade.addColorStop(0, "rgba(18,32,38,.10)");
            topShade.addColorStop(1, "rgba(18,32,38,0)");
            ctx.fillStyle = topShade;
            ctx.fillRect(padding.left, padding.top, width, topDepth);
            const bottomShade = ctx.createLinearGradient(0, padding.top + height, 0, padding.top + height - bottomDepth);
            bottomShade.addColorStop(0, "rgba(18,32,38,.15)");
            bottomShade.addColorStop(1, "rgba(18,32,38,0)");
            ctx.fillStyle = bottomShade;
            ctx.fillRect(padding.left, padding.top + height - bottomDepth, width, bottomDepth);
        }
    }

    function getSideStationShift(data, station, branch) {
        if (!data.showNumbering || !station.go || station.numberings.length < 2) return 0;
        const baseInset = branch ? 130 : 200;
        const markerSize = branch ? 50 : 80;
        const markerGap = markerSize * .08;
        const textGap = branch ? 10 : 18;
        const edgeGap = branch ? 12 : 20;
        const markerBlockWidth = station.numberings.length * markerSize
            + (station.numberings.length - 1) * markerGap;
        return Math.max(0, Math.ceil(edgeGap + markerBlockWidth + textGap - baseInset));
    }

    function getSharedBranchShift(data, stations, branch) {
        if (!branch) return 0;
        return Math.max(...stations.slice(0, 2).map(station => getSideStationShift(data, station, true)));
    }

    function getSideLayout(data, align) {
        if (align === "left") return data.branchLeft ? "double" : (data.spurLeft ? "spur" : "single");
        return data.branchRight ? "double" : (data.spurRight ? "spur" : "single");
    }

    function createBandPath(ctx, data, width, lineTop, lineBottom, lineY, branchStart) {
        const sharedRightShift = getSharedBranchShift(data, data.rightStations, data.branchRight);
        const sharedLeftShift = getSharedBranchShift(data, data.leftStations, data.branchLeft);
        const rightTopShift = data.branchRight ? sharedRightShift : getSideStationShift(data, data.rightStations[0], false);
        const rightBottomShift = data.branchRight ? sharedRightShift : getSideStationShift(data, data.rightStations[1], false);
        const leftTopShift = data.branchLeft ? sharedLeftShift : getSideStationShift(data, data.leftStations[0], false);
        const leftBottomShift = data.branchLeft ? sharedLeftShift : getSideStationShift(data, data.leftStations[1], false);
        ctx.beginPath();
        if (data.branchRight) {
            ctx.moveTo(width - branchStart, lineTop);
            ctx.lineTo(width - branchStart + 65, lineTop - 65);
            if (data.rightStations[0].go) {
                ctx.lineTo(width - 130 - rightTopShift, lineTop - 65);
                ctx.lineTo(width - 50 - rightTopShift, lineTop - 25);
                ctx.lineTo(width - 130 - rightTopShift, lineTop + 12);
            } else {
                ctx.lineTo(width, lineTop - 65);
                ctx.lineTo(width, lineTop + 12);
            }
            ctx.lineTo(width - branchStart + 100, lineTop + 12);
            ctx.lineTo(width - branchStart + 60, lineY);
            ctx.lineTo(width - branchStart + 100, lineBottom - 12);
            if (data.rightStations[1].go) {
                ctx.lineTo(width - 130 - rightBottomShift, lineBottom - 12);
                ctx.lineTo(width - 50 - rightBottomShift, lineBottom + 25);
                ctx.lineTo(width - 130 - rightBottomShift, lineBottom + 65);
            } else {
                ctx.lineTo(width, lineBottom - 12);
                ctx.lineTo(width, lineBottom + 65);
            }
            ctx.lineTo(width - branchStart + 65, lineBottom + 65);
            ctx.lineTo(width - branchStart, lineBottom);
        } else if (data.rightStations[0].go) {
            ctx.moveTo(width - 160 - rightTopShift, lineTop);
            ctx.lineTo(width - 65 - rightTopShift, lineY);
            ctx.lineTo(width - 160 - rightTopShift, lineBottom);
        } else {
            ctx.moveTo(width, lineTop);
            ctx.lineTo(width, lineBottom);
        }

        if (data.branchLeft) {
            ctx.lineTo(branchStart, lineBottom);
            ctx.lineTo(branchStart - 65, lineBottom + 65);
            if (data.leftStations[1].go) {
                ctx.lineTo(130 + leftBottomShift, lineBottom + 65);
                ctx.lineTo(50 + leftBottomShift, lineBottom + 25);
                ctx.lineTo(130 + leftBottomShift, lineBottom - 12);
            } else {
                ctx.lineTo(0, lineBottom + 65);
                ctx.lineTo(0, lineBottom - 12);
            }
            ctx.lineTo(branchStart - 100, lineBottom - 12);
            ctx.lineTo(branchStart - 60, lineY);
            ctx.lineTo(branchStart - 100, lineTop + 12);
            if (data.leftStations[0].go) {
                ctx.lineTo(130 + leftTopShift, lineTop + 12);
                ctx.lineTo(50 + leftTopShift, lineTop - 25);
                ctx.lineTo(130 + leftTopShift, lineTop - 65);
            } else {
                ctx.lineTo(0, lineTop + 12);
                ctx.lineTo(0, lineTop - 65);
            }
            ctx.lineTo(branchStart - 65, lineTop - 65);
            ctx.lineTo(branchStart, lineTop);
        } else if (data.leftStations[0].go) {
            ctx.lineTo(160 + leftTopShift, lineBottom);
            ctx.lineTo(65 + leftTopShift, lineY);
            ctx.lineTo(160 + leftTopShift, lineTop);
        } else {
            ctx.lineTo(0, lineBottom);
            ctx.lineTo(0, lineTop);
        }
        ctx.closePath();
    }

    function createSpurBandPath(ctx, data, width, lineTop, branchStart, align) {
        const isRight = align === "right";
        const station = isRight ? data.rightStations[1] : data.leftStations[1];
        const shift = getSideStationShift(data, station, true);
        const top = lineTop - 170;
        const bottom = lineTop - 95;
        const center = (top + bottom) / 2;
        ctx.beginPath();
        if (isRight) {
            ctx.moveTo(width - branchStart, lineTop);
            ctx.lineTo(width - branchStart + 168, top);
            if (station.go) {
                ctx.lineTo(width - 160 - shift, top);
                ctx.lineTo(width - 65 - shift, center);
                ctx.lineTo(width - 160 - shift, bottom);
            } else {
                ctx.lineTo(width, top);
                ctx.lineTo(width, bottom);
            }
            ctx.lineTo(width - branchStart + 194, bottom);
            ctx.lineTo(width - branchStart + 102, lineTop);
        } else {
            ctx.moveTo(branchStart, lineTop);
            ctx.lineTo(branchStart - 168, top);
            if (station.go) {
                ctx.lineTo(160 + shift, top);
                ctx.lineTo(65 + shift, center);
                ctx.lineTo(160 + shift, bottom);
            } else {
                ctx.lineTo(0, top);
                ctx.lineTo(0, bottom);
            }
            ctx.lineTo(branchStart - 194, bottom);
            ctx.lineTo(branchStart - 102, lineTop);
        }
        ctx.closePath();
    }

    function drawLineBands(ctx, data, width, height) {
        const half = width / 2;
        const lineY = height / 2 + 80;
        const lineHeight = 100;
        const lineTop = lineY - lineHeight / 2;
        const lineBottom = lineY + lineHeight / 2;
        const branchStart = Math.min(620, half - lineHeight);

        ctx.save();
        createBandPath(ctx, data, width, lineTop, lineBottom, lineY, branchStart);
        ctx.clip();
        if (data.branchRight) {
            ctx.fillStyle = data.rightStations[0].lineColor;
            ctx.fillRect(half, lineTop - 65, half, 115);
            ctx.fillStyle = data.rightStations[1].lineColor;
            ctx.fillRect(half, lineY, half, 115);
        } else {
            ctx.fillStyle = data.rightStations[0].lineColor;
            ctx.fillRect(half, lineTop, half, lineHeight);
        }
        if (data.branchLeft) {
            ctx.fillStyle = data.leftStations[0].lineColor;
            ctx.fillRect(0, lineTop - 65, half, 115);
            ctx.fillStyle = data.leftStations[1].lineColor;
            ctx.fillRect(0, lineY, half, 115);
        } else {
            ctx.fillStyle = data.leftStations[0].lineColor;
            ctx.fillRect(0, lineTop, half, lineHeight);
        }
        const colorHeight = lineHeight / data.routeColors.length;
        data.routeColors.forEach((color, index) => {
            ctx.fillStyle = color;
            ctx.fillRect(half - lineHeight / 2, lineTop + colorHeight * index, lineHeight, Math.ceil(colorHeight));
        });
        ctx.restore();
        if (getSideLayout(data, "left") === "spur") {
            ctx.save();
            ctx.fillStyle = data.leftStations[1].lineColor;
            createSpurBandPath(ctx, data, width, lineTop, branchStart, "left");
            ctx.fill();
            ctx.restore();
        }
        if (getSideLayout(data, "right") === "spur") {
            ctx.save();
            ctx.fillStyle = data.rightStations[1].lineColor;
            createSpurBandPath(ctx, data, width, lineTop, branchStart, "right");
            ctx.fill();
            ctx.restore();
        }
        return { half, lineY, lineTop, lineBottom, branchStart, height };
    }

    function fitText(ctx, text, maxWidth, startSize, minSize, font, weight = "600") {
        let size = startSize;
        do {
            ctx.font = `${weight} ${size}px ${font}`;
            if (ctx.measureText(text).width <= maxWidth) break;
            size -= 2;
        } while (size > minSize);
        return size;
    }

    function spaceCurrentStationName(text) {
        const value = String(text || "");
        const spacing = ["　", " "][value.length - 2] || "";
        return value.split("").join(spacing);
    }

    function drawText(ctx, options) {
        const {
            text = "", x, y, maxWidth = Infinity, startSize, minSize = startSize,
            font, weight = "600", align = "center", baseline = "alphabetic",
            color = state.black, composite = "source-over", visualCenter = false,
            strokeWidth = 0, fitMode = "shrink"
        } = options;
        const size = fitMode === "condense"
            ? startSize
            : fitText(ctx, text, maxWidth, startSize, minSize, font, weight);
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalCompositeOperation = composite;
        ctx.textAlign = align;
        ctx.font = `${weight} ${size}px ${font}`;
        let drawY = y;
        const metrics = ctx.measureText(text);
        if (visualCenter) {
            ctx.textBaseline = "alphabetic";
            drawY += (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
        } else {
            ctx.textBaseline = baseline;
        }
        const horizontalScale = fitMode === "condense" && Number.isFinite(maxWidth) && metrics.width > maxWidth
            ? maxWidth / metrics.width
            : 1;
        if (strokeWidth > 0) {
            ctx.lineWidth = strokeWidth;
            ctx.lineJoin = "round";
            ctx.strokeStyle = color;
            if (fitMode === "condense") {
                ctx.save();
                ctx.translate(x, 0);
                ctx.scale(horizontalScale, 1);
                ctx.strokeText(text, 0, drawY);
                ctx.restore();
            } else {
                ctx.strokeText(text, x, drawY, maxWidth);
            }
        }
        if (fitMode === "condense") {
            ctx.translate(x, 0);
            ctx.scale(horizontalScale, 1);
            ctx.fillText(text, 0, drawY);
        } else {
            ctx.fillText(text, x, drawY, maxWidth);
        }
        const width = Math.min(metrics.width * horizontalScale, maxWidth);
        const top = drawY - metrics.actualBoundingBoxAscent;
        const bottom = drawY + metrics.actualBoundingBoxDescent;
        ctx.restore();
        return { width, size, top, bottom, horizontalScale };
    }

    function paintNumbering(ctx, x, y, size, numbering, rounded = true) {
        const route = String(numbering.route || "");
        const number = String(numbering.number || "");
        ctx.save();
        ctx.fillStyle = numbering.color;
        if (rounded) {
            roundRectPath(ctx, x, y, size, size, size * .10);
            ctx.fill();
        } else {
            ctx.fillRect(x, y, size, size);
        }
        const inset = size * .10;
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = state.black;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        let routeSize = size * .34;
        do {
            ctx.font = `700 ${routeSize}px ${FONT_TLC}`;
            if (ctx.measureText(route).width <= size * .76) break;
            routeSize -= 1;
        } while (routeSize > size * .16);
        ctx.fillText(route, x + size / 2, y + size * .40, size * .78);
        ctx.font = `700 ${size * .42}px ${FONT_TLC}`;
        ctx.fillText(number, x + size / 2, y + size * .79);
        ctx.restore();
    }

    function drawNumbering(ctx, x, y, size, numbering, rounded = true) {
        const marker = document.createElement("canvas");
        marker.width = Math.ceil(size);
        marker.height = Math.ceil(size);
        paintNumbering(marker.getContext("2d"), 0, 0, size, numbering, rounded);
        ctx.drawImage(marker, x, y, size, size);
    }

    function drawTlcAndNumberings(ctx, data, chinese, zhuyin, geometry) {
        if (!data.showNumbering || !data.current.numberings.length) return;
        const count = data.current.numberings.length;
        const tlcX = Math.max(25, geometry.half - chinese.width / 2 - 80 - 183.6 * count);
        const markerScale = data.current.showTlc && getSideLayout(data, "left") !== "single" && tlcX < geometry.branchStart - 50 ? 1.2 : 1.5;
        const markerSize = 100 * markerScale;
        const markerStep = 108 * markerScale;

        if (data.current.showTlc) {
            const groupY = geometry.lineTop - 250;
            const groupWidth = (108 * count + 12) * markerScale;
            const groupHeight = 145 * markerScale;
            const group = document.createElement("canvas");
            group.width = Math.ceil(groupWidth);
            group.height = Math.ceil(groupHeight);
            const groupCtx = group.getContext("2d");
            groupCtx.fillStyle = state.black;
            roundRectPath(groupCtx, 0, 0, groupWidth, groupHeight, 16 * markerScale);
            groupCtx.fill();
            groupCtx.globalCompositeOperation = "destination-out";
            groupCtx.fillStyle = "#000";
            groupCtx.textAlign = "center";
            groupCtx.textBaseline = "alphabetic";
            groupCtx.font = `700 ${34 * markerScale}px ${FONT_TLC}`;
            groupCtx.fillText(data.current.tlc, groupWidth / 2, 30 * markerScale, groupWidth - 16 * markerScale);
            groupCtx.globalCompositeOperation = "source-over";
            data.current.numberings.forEach((numbering, index) => {
                paintNumbering(
                    groupCtx,
                    10 * markerScale + markerStep * index,
                    34 * markerScale,
                    markerSize,
                    numbering,
                    true
                );
            });
            ctx.drawImage(group, tlcX, groupY);
        } else {
            data.current.numberings.forEach((numbering, index) => {
                drawNumbering(
                    ctx,
                    tlcX + 8 * markerScale + markerStep * index,
                    geometry.lineTop - 250,
                    markerSize,
                    numbering,
                    true
                );
            });
        }
    }

    function drawSideStations(ctx, data, width, geometry, stations, layout, align, mode = "details", currentEnglish = null) {
        const isRight = align === "right";
        const mirror = value => isRight ? width - value : value;
        const doubleBranch = layout === "double";
        const spur = layout === "spur";
        const count = layout === "single" ? 1 : 2;
        const sharedBranchShift = getSharedBranchShift(data, stations, doubleBranch);
        for (let index = 0; index < count; index += 1) {
            const station = stations[index];
            const spurStation = spur && index === 1;
            const compactStation = doubleBranch || spurStation;
            const inwardShift = doubleBranch ? sharedBranchShift : getSideStationShift(data, station, compactStation);
            const baseX = doubleBranch ? 130 : (station.go ? 200 : 80);
            const x = mirror(baseX + inwardShift);
            const y = doubleBranch
                ? [geometry.lineTop - 25, geometry.lineBottom + 25][index]
                : (spurStation ? geometry.lineTop - 132.5 : geometry.lineY);
            let maxWidth = compactStation ? Math.max(220, geometry.branchStart - 270) : Math.max(300, geometry.half - 390);
            if (!compactStation && mode === "details" && currentEnglish) {
                const centerEdge = isRight
                    ? geometry.half + currentEnglish.width / 2
                    : geometry.half - currentEnglish.width / 2;
                maxWidth = Math.max(140, isRight ? x - centerEdge - 40 : centerEdge - x - 40);
            }
            const chineseSize = compactStation ? 60 : (station.go ? 80 : 70);
            const englishStartSize = doubleBranch ? 40 : (spurStation ? 42 : 55);
            const englishY = doubleBranch ? y + 80 : (spurStation ? geometry.lineTop - 45 : geometry.lineBottom + 70);
            if (mode === "names") {
                drawText(ctx, {
                    text: station.chinese,
                    x,
                    y,
                    maxWidth,
                    startSize: chineseSize,
                    minSize: 40,
                    font: FONT_SIDE_CHINESE,
                    weight: "400",
                    align,
                    visualCenter: true,
                    color: "#000",
                    composite: "destination-out",
                    fitMode: "condense"
                });
                continue;
            }
            const english = drawText(ctx, {
                text: station.english,
                x,
                y: englishY,
                maxWidth,
                startSize: englishStartSize,
                minSize: englishStartSize,
                font: FONT_LATIN,
                weight: "400",
                align,
                fitMode: "condense"
            });
            if (data.showNumbering && station.go && station.numberings.length) {
                const nSize = compactStation ? 50 : 80;
                const numberingY = doubleBranch ? y + 36 : (spurStation ? geometry.lineTop - 90 : geometry.lineBottom + 15);
                const numberingGap = nSize * .08;
                const numberingTextGap = compactStation ? 10 : 18;
                const numberingBlockWidth = station.numberings.length * nSize
                    + Math.max(0, station.numberings.length - 1) * numberingGap;
                const singleMarkerBase = compactStation ? 120 : 180;
                const numberingX = station.numberings.length < 2
                    ? (isRight ? width - singleMarkerBase : singleMarkerBase - nSize * 1.08)
                    : (isRight ? x + numberingTextGap : x - numberingTextGap - numberingBlockWidth);
                station.numberings.forEach((numbering, numberIndex) => {
                    drawNumbering(
                        ctx,
                        numberingX + numberIndex * (nSize + numberingGap),
                        numberingY,
                        nSize,
                        numbering,
                        true
                    );
                });
            }
        }
    }

    function drawCityMarks(ctx, data, width, stationNameTop) {
        if (!data.showCityMarks) return;
        const marks = data.cityMarks.slice(0, 4);
        marks.forEach((mark, index) => {
            const size = 80;
            const outlineWidth = 4;
            const x = width - 160 - (marks.length - 1 - index) * 100;
            // Align the visible top edge of the marker with the station-name glyphs.
            const y = stationNameTop + outlineWidth / 2;
            ctx.save();
            ctx.lineWidth = outlineWidth;
            ctx.strokeStyle = state.black;
            ctx.fillStyle = state.black;
            roundRectPath(ctx, x, y, size, size, 7);
            if (mark.fill) ctx.fill();
            ctx.stroke();
            ctx.fillStyle = mark.fill ? "#fff" : state.black;
            ctx.textAlign = "center";
            ctx.font = `400 70px ${FONT_CURRENT_CHINESE}`;
            ctx.fillText(mark.text, x + size / 2, y + 65, size - 5);
            ctx.restore();
        });
    }

    function drawContent(ctx, data, frame) {
        const { width, height, padding } = frame;
        ctx.save();
        ctx.translate(padding.left, padding.top);
        const bandLayer = document.createElement("canvas");
        bandLayer.width = width;
        bandLayer.height = height;
        const bandCtx = bandLayer.getContext("2d");
        const geometry = drawLineBands(bandCtx, data, width, height);
        const leftLayout = getSideLayout(data, "left");
        const rightLayout = getSideLayout(data, "right");
        drawSideStations(bandCtx, data, width, geometry, data.leftStations, leftLayout, "left", "names");
        drawSideStations(bandCtx, data, width, geometry, data.rightStations, rightLayout, "right", "names");
        ctx.drawImage(bandLayer, 0, 0);

        const chinese = drawText(ctx, {
            text: spaceCurrentStationName(data.current.chinese),
            x: geometry.half,
            y: geometry.lineTop - 120,
            maxWidth: Math.min(width * .48, 960),
            startSize: 150,
            minSize: 102,
            font: FONT_CURRENT_CHINESE,
            weight: "400",
            fitMode: "condense"
        });
        const zhuyin = drawText(ctx, {
            text: data.current.zhuyin,
            x: geometry.half,
            y: geometry.lineTop - 40,
            maxWidth: Math.min(width * .56, 1040),
            startSize: 50,
            minSize: 30,
            font: FONT_CURRENT_CHINESE,
            weight: "400",
            fitMode: "condense"
        });
        const currentEnglish = drawText(ctx, {
            text: data.current.english,
            x: geometry.half,
            y: geometry.lineBottom + 80,
            maxWidth: Math.min(width * .52, 960),
            startSize: 65,
            minSize: 38,
            font: FONT_LATIN,
            weight: "700",
            fitMode: "condense"
        });

        if (data.showLanguages) {
            const sideX = geometry.half + chinese.width / 2 + 65;
            const visibleMarkCount = data.showCityMarks ? Math.max(1, data.cityMarks.length) : 0;
            const languageWidth = Math.max(80, width - sideX - (visibleMarkCount * 90 + 160));
            drawText(ctx, {
                text: data.current.japanese,
                x: sideX,
                y: geometry.lineTop - 195,
                maxWidth: languageWidth,
                startSize: 50,
                minSize: 28,
                font: FONT_JAPANESE,
                weight: "500",
                strokeWidth: 1.2,
                align: "left",
                fitMode: "condense"
            });
            drawText(ctx, {
                text: data.current.korean,
                x: sideX,
                y: geometry.lineTop - 120,
                maxWidth: languageWidth,
                startSize: 50,
                minSize: 28,
                font: FONT_KOREAN,
                weight: "500",
                strokeWidth: 1,
                align: "left",
                fitMode: "condense"
            });
        }

        drawTlcAndNumberings(ctx, data, chinese, zhuyin, geometry);
        drawSideStations(ctx, data, width, geometry, data.leftStations, leftLayout, "left", "details", currentEnglish);
        drawSideStations(ctx, data, width, geometry, data.rightStations, rightLayout, "right", "details", currentEnglish);
        drawCityMarks(ctx, data, width, chinese.top);
        ctx.restore();
    }

    function renderToCanvas(target, data) {
        const frame = FRAMES[data.board.type] || FRAMES["SE-6"];
        const fullWidth = frame.width + frame.padding.left + frame.padding.right;
        const fullHeight = frame.height + frame.padding.top + frame.padding.bottom;
        target.width = fullWidth;
        target.height = fullHeight;
        const ctx = target.getContext("2d");
        ctx.clearRect(0, 0, fullWidth, fullHeight);
        drawFrame(ctx, frame, data);
        drawContent(ctx, data, frame);
        return { fullWidth, fullHeight };
    }

    function updatePreview() {
        const { fullWidth, fullHeight } = renderToCanvas(canvas, state);
        const stageStyle = window.getComputedStyle(stage);
        const horizontalPadding = parseFloat(stageStyle.paddingLeft) + parseFloat(stageStyle.paddingRight);
        const availableWidth = Math.max(280, stage.clientWidth - horizontalPadding);
        const displayWidth = Math.min(availableWidth, fullWidth);
        const displayHeight = displayWidth / fullWidth * fullHeight;
        canvasWrap.style.width = `${displayWidth}px`;
        canvasWrap.style.height = `${displayHeight}px`;
        validationMessage.classList.remove("show");
        saveState();
    }

    function schedulePreview() {
        clearTimeout(renderTimer);
        renderTimer = window.setTimeout(updatePreview, 60);
    }

    function validate() {
        const valid = form.checkValidity();
        validationMessage.classList.toggle("show", !valid);
        if (!valid) form.querySelector(":invalid")?.focus();
        return valid;
    }

    function downloadPng() {
        if (!validate()) return;
        const output = document.createElement("canvas");
        renderToCanvas(output, state);
        output.toBlob(blob => {
            const link = document.createElement("a");
            link.download = `JR风格中文站牌_${state.current.chinese}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }, "image/png");
    }

    const INSPECTOR_META = {
        current: "本站信息",
        left: "左侧相邻站",
        right: "右侧相邻站",
        route: "线路颜色"
    };

    function selectInspector(key) {
        if (!INSPECTOR_META[key]) return;
        activeInspector = key;
        inspectorTitle.textContent = INSPECTOR_META[key];
        document.querySelectorAll("[data-inspector-panel]").forEach(panel => {
            panel.hidden = panel.dataset.inspectorPanel !== key;
        });
        document.querySelectorAll(".canvas-hotspot").forEach(button => {
            button.classList.toggle("active", button.dataset.inspector === key);
        });
        showInspector();
    }

    function showInspector() {
        editorWorkspace.classList.remove("sidebar-hidden");
        inspectorPanel.setAttribute("aria-hidden", "false");
        showInspectorButton.hidden = true;
        schedulePreview();
    }

    function hideInspector() {
        editorWorkspace.classList.add("sidebar-hidden");
        inspectorPanel.setAttribute("aria-hidden", "true");
        showInspectorButton.hidden = false;
        schedulePreview();
    }

    function applyInspectorPinState() {
        editorWorkspace.classList.toggle("sidebar-unpinned", !inspectorPinned);
        pinInspectorButton.textContent = inspectorPinned ? "取消固定" : "固定侧栏";
        pinInspectorButton.setAttribute("aria-pressed", String(inspectorPinned));
        try {
            localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(inspectorPinned));
        } catch (error) {
            console.warn("无法保存侧栏状态。", error);
        }
    }

    function toggleInspectorPin() {
        inspectorPinned = !inspectorPinned;
        applyInspectorPinState();
        schedulePreview();
    }

    function resetGenerator() {
        state = defaultState();
        syncBoundFields();
        updatePreview();
    }

    form.addEventListener("input", event => {
        const target = event.target;
        if (target.dataset.bind) {
            let value = target.type === "checkbox" ? target.checked : target.value;
            if (target.dataset.bind === "current.tlc") {
                value = value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3);
                target.value = value;
            }
            setPath(target.dataset.bind, value);
            syncBoundPeers(target.dataset.bind, target);
            const exclusiveBranch = {
                branchLeft: "spurLeft",
                spurLeft: "branchLeft",
                branchRight: "spurRight",
                spurRight: "branchRight"
            }[target.dataset.bind];
            if (exclusiveBranch && value) {
                state[exclusiveBranch] = false;
                syncBoundPeers(exclusiveBranch, null);
            }
            if ((target.dataset.bind === "spurLeft" || target.dataset.bind === "spurRight") && value) {
                state.showNumbering = false;
                state.showCityMarks = false;
                state.current.showTlc = false;
                state.showLanguages = false;
                ["showNumbering", "showCityMarks", "current.showTlc", "showLanguages"].forEach(path => {
                    syncBoundPeers(path, null);
                });
            }
            if (target.dataset.bind === "current.showTlc" && value && state.current.numberings.length === 0) {
                state.current.numberings.push({ route: "", number: "", color: state.routeColors[0] || LINE_TWO_GREEN });
                renderNumberingLists();
            }
            if (target.dataset.bind === "showNumbering" && value && state.current.numberings.length === 0) {
                state.current.numberings.push({ route: "", number: "", color: state.routeColors[0] || LINE_TWO_GREEN });
                renderNumberingLists();
            }
        } else if (target.dataset.listPath) {
            getPath(target.dataset.listPath)[Number(target.dataset.listIndex)][target.dataset.listKey] = target.value;
        } else if (target.dataset.markIndex !== undefined) {
            const value = target.type === "checkbox" ? target.checked : target.value;
            state.cityMarks[Number(target.dataset.markIndex)][target.dataset.markKey] = value;
        } else if (target.dataset.routeIndex !== undefined) {
            state.routeColors[Number(target.dataset.routeIndex)] = target.value;
        }
        updateVisibility();
        schedulePreview();
    });

    form.addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button) return;
        if (button.dataset.addNumbering) {
            const list = getPath(button.dataset.addNumbering);
            if (list.length < 2) {
                list.push({ route: "", number: "", color: state.routeColors[0] || LINE_TWO_GREEN });
                renderDynamicControls();
                updateVisibility();
                schedulePreview();
            }
        } else if (button.dataset.removeNumbering) {
            getPath(button.dataset.removeNumbering).splice(Number(button.dataset.removeIndex), 1);
            renderDynamicControls();
            schedulePreview();
        } else if (button.dataset.removeMark !== undefined) {
            state.cityMarks.splice(Number(button.dataset.removeMark), 1);
            renderMarks();
            schedulePreview();
        } else if (button.dataset.removeRoute !== undefined) {
            if (state.routeColors.length > 1) state.routeColors.splice(Number(button.dataset.removeRoute), 1);
            renderRouteColors();
            schedulePreview();
        }
    });

    document.getElementById("addMarkButton").addEventListener("click", () => {
        if (state.cityMarks.length < 4) state.cityMarks.push({ text: "", fill: true });
        renderMarks();
        schedulePreview();
    });
    document.getElementById("addRouteColorButton").addEventListener("click", () => {
        if (state.routeColors.length < 4) state.routeColors.push(LINE_TWO_GREEN);
        renderRouteColors();
        schedulePreview();
    });
    document.getElementById("resetButton").addEventListener("click", resetGenerator);
    document.getElementById("downloadButton").addEventListener("click", downloadPng);

    document.getElementById("hotspotLayer").addEventListener("click", event => {
        const button = event.target.closest(".canvas-hotspot");
        if (!button) return;
        selectInspector(button.dataset.inspector);
    });
    showInspectorButton.addEventListener("click", showInspector);
    document.getElementById("hideInspectorButton").addEventListener("click", hideInspector);
    pinInspectorButton.addEventListener("click", toggleInspectorPin);
    document.addEventListener("click", event => {
        if (!event.target.closest(".color-editor")) closeColorEditors();
    });
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (document.querySelector(".color-editor.open")) closeColorEditors();
        else if (!inspectorPinned) hideInspector();
    });
    window.addEventListener("resize", schedulePreview);
    compactInspectorMedia.addEventListener("change", event => {
        if (event.matches) hideInspector();
        else showInspector();
    });

    syncBoundFields();
    applyInspectorPinState();
    selectInspector(activeInspector);
    if (compactInspectorMedia.matches) hideInspector();
    if (document.fonts?.ready) document.fonts.ready.then(updatePreview);
    else updatePreview();
})();
