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

    /** Notify UI to listen for keypress events */
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
            pasteText(msg.content);
        }

        if (msg.type === "copy-text") {
            copySelectedText();
        }
    };

    /** Paste text into the selected node or create a new text node */
    async function pasteText(content) {
        const selection = figma.currentPage.selection;
        const textNodes = selection.filter(node => node.type === "TEXT");

        if (textNodes.length > 0) {
            textNodes[0].characters = content;
        } else {
            const newTextNode = figma.createText();
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
                await figma.loadFontAsync(node.fontName);
                newItems.push(node.characters);
            } else if (node.type === "FRAME" || node.type === "GROUP") {
                const textNodes = node.findAll(n => n.type === "TEXT");
                for (const textNode of textNodes) {
                    await figma.loadFontAsync(textNode.fontName);
                    newItems.push(textNode.characters);
                }
            }
        }

        if (newItems.length > 0) {
            clipboardItems = [...newItems, ...clipboardItems].slice(0, MAX_CLIPBOARD_ITEMS);
            await saveClipboardItems();
            updateUI();
        }
    }

    /** Detect selection changes and enable copy listener */
    figma.on("selectionchange", async () => {
        await copySelectedText();
    });

    

    // Load clipboard items on plugin start
    loadClipboardItems();
}
