"use strict";

if (figma.editorType === "figma") {
    figma.showUI(__html__, { width: 400, height: 560 });

    const MAX_CLIPBOARD_ITEMS = 10;
    let clipboardItems: string[] = [];
    let isCopyListenerEnabled: boolean = false; // State for copy listener

    /** Load clipboard items and copy listener state from storage */
    async function loadSettings(): Promise<void> {
        try {
            const savedItems = await figma.clientStorage.getAsync("clipboardItems") as string[] | undefined;
            if (Array.isArray(savedItems)) {
                clipboardItems = savedItems;
            }

            const savedListenerState = await figma.clientStorage.getAsync("copyListenerEnabled") as boolean | undefined;
            isCopyListenerEnabled = savedListenerState ?? false;

            updateUI();
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    }

    /** Save clipboard items to storage */
    async function saveClipboardItems(): Promise<void> {
        try {
            await figma.clientStorage.setAsync("clipboardItems", clipboardItems);
        } catch (error) {
            console.error("Error saving clipboard items:", error);
        }
    }

    /** Save copy listener state to storage */
    async function saveCopyListenerState(): Promise<void> {
        try {
            await figma.clientStorage.setAsync("copyListenerEnabled", isCopyListenerEnabled);
        } catch (error) {
            console.error("Error saving copy listener state:", error);
        }
    }

    /** Update UI with clipboard items and listener state */
    function updateUI(): void {
        figma.ui.postMessage({
            type: "update-clipboard",
            items: clipboardItems,
            copyListenerEnabled: isCopyListenerEnabled
        });
    }

    /** Load fonts for a text node */
    async function loadAllFonts(textNode: TextNode): Promise<void> {
        const fonts = textNode.getRangeAllFontNames(0, textNode.characters.length);
        for (const font of fonts) {
            await figma.loadFontAsync(font);
        }
    }

    /** Paste text into selected text node or create a new one */
    async function pasteText(content: string, append: boolean = false): Promise<void> {
        const selection = figma.currentPage.selection;
        const textNodes = selection.filter(node => node.type === "TEXT") as TextNode[];

        if (textNodes.length > 0) {
            const textNode = textNodes[0];
            await loadAllFonts(textNode);
            textNode.characters = append ? textNode.characters + "\n" + content : content;
        } else {
            const newTextNode = figma.createText();
            await figma.loadFontAsync(newTextNode.fontName as FontName);
            newTextNode.characters = content;
            figma.currentPage.appendChild(newTextNode);
            figma.currentPage.selection = [newTextNode];
            figma.viewport.scrollAndZoomIntoView([newTextNode]);
        }
    }

    /** Copy selected text nodes */
    async function copySelectedText(): Promise<void> {
        const selection = figma.currentPage.selection;
        let newItems: string[] = [];

        for (const node of selection) {
            if (node.type === "TEXT" && node.characters.trim() !== "") {
                await loadAllFonts(node);
                newItems.push(node.characters);
            } else if (node.type === "FRAME" || node.type === "GROUP") {
                const textNodes = node.findAll(n => n.type === "TEXT") as TextNode[];
                for (const textNode of textNodes) {
                    await loadAllFonts(textNode);
                    newItems.push(textNode.characters);
                }
            }
        }

        if (newItems.length > 0) {
            clipboardItems = [...new Set([...newItems, ...clipboardItems])].slice(0, MAX_CLIPBOARD_ITEMS);
            await saveClipboardItems();
            updateUI();
        }
    }

    /** Handle messages from UI */
    figma.ui.onmessage = async (msg: any) => {
        switch (msg.type) {
            case "clear-clipboard":
                clipboardItems = [];
                await saveClipboardItems();
                updateUI();
                break;

            case "paste-text":
                if (msg.content) {
                    await pasteText(msg.content, msg.append ?? false);
                }
                break;

            case "copy-text":
                await copySelectedText();
                break;

            case "toggle-copy-listener":
                isCopyListenerEnabled = msg.enabled;
                await saveCopyListenerState();
                if (isCopyListenerEnabled) {
                    figma.notify("Copy listener enabled");
                } else {
                    figma.notify("Copy listener disabled");
                }
                updateUI();
                break;
        }
    };

    /** Detect selection changes and copy automatically if enabled */
    figma.on("selectionchange", async () => {
        if (isCopyListenerEnabled) {
            await copySelectedText();
        }
    });

    // Load settings on plugin start
    loadSettings();
}
