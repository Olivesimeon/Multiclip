"use strict";

if (figma.editorType === "figma") {
    figma.showUI(__html__, { width: 400, height: 560 });

    const MAX_CLIPBOARD_ITEMS = 10;
    let clipboardItems = [];

    /** Load clipboard items from storage */
    async function loadClipboardItems() {
        try {
            const savedItems = await figma.clientStorage.getAsync("clipboardItems");
            if (Array.isArray(savedItems)) {
                clipboardItems = savedItems;
                updateUI();
            }
        } catch (error) {
            console.error("Error loading clipboard items:", error);
        }
    }

    /** Save clipboard items to storage */
    async function saveClipboardItems() {
        try {
            await figma.clientStorage.setAsync("clipboardItems", clipboardItems);
        } catch (error) {
            console.error("Error saving clipboard items:", error);
        }
    }

    /** Notify UI to enable copy listener */
    figma.ui.postMessage({ type: "enable-copy-listener" });

    /** Update UI with clipboard items */
    function updateUI() {
        figma.ui.postMessage({ type: "update-clipboard", items: clipboardItems });
    }

    /** Handle messages from UI */
    figma.ui.onmessage = async (msg) => {
        if (msg.type === "clear-clipboard") {
            clipboardItems = [];
            await saveClipboardItems();
            updateUI();
        }

        if (msg.type === "paste-text" && msg.content) {
            pasteText(msg.content, msg.append);
        }

        if (msg.type === "copy-text") {
            copySelectedText();
        }
    };

    /** Load all fonts for a text node */
    async function loadAllFonts(textNode) {
        const fonts = textNode.getRangeAllFontNames(0, textNode.characters.length);
        for (const font of fonts) {
            await figma.loadFontAsync(font);
        }
    }

    /** Paste text into selected text node or create a new one */
    async function pasteText(content, append = false) {
        const selection = figma.currentPage.selection;
        const textNodes = selection.filter(node => node.type === "TEXT");

        if (textNodes.length > 0) {
            const textNode = textNodes[0];
            await loadAllFonts(textNode);
            textNode.characters = append ? textNode.characters + "\n" + content : content;
        } else {
            const newTextNode = figma.createText();
            await figma.loadFontAsync(newTextNode.fontName);
            newTextNode.characters = content;
            figma.currentPage.appendChild(newTextNode);
            figma.currentPage.selection = [newTextNode];
            figma.viewport.scrollAndZoomIntoView([newTextNode]);
        }
    }

    /** Copy selected text nodes */
    async function copySelectedText() {
        const selection = figma.currentPage.selection;
        let newItems = [];

        for (const node of selection) {
            if (node.type === "TEXT" && node.characters.trim() !== "") {
                await loadAllFonts(node);
                newItems.push(node.characters);
            } else if (node.type === "FRAME" || node.type === "GROUP") {
                const textNodes = node.findAll(n => n.type === "TEXT");
                for (const textNode of textNodes) {
                    await loadAllFonts(textNode);
                    newItems.push(textNode.characters);
                }
            }
        }

        if (newItems.length > 0) {
            // Prevent duplicates
            clipboardItems = [...new Set([...newItems, ...clipboardItems])].slice(0, MAX_CLIPBOARD_ITEMS);
            await saveClipboardItems();
            updateUI();
        }
    }

    // Load clipboard items on plugin start
    loadClipboardItems();
}
