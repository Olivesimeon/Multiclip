"use strict";
// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
if (figma.editorType === 'figma') {
    figma.showUI(__html__, { width: 320, height: 500 });
    const MAX_CLIPBOARD_ITEMS = 10;
    let clipboardItems = [];
    // Load saved items when plugin starts
    function loadSavedItems() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const savedItems = yield figma.clientStorage.getAsync('clipboardItems');
                if (savedItems && Array.isArray(savedItems)) {
                    clipboardItems = savedItems;
                    figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
                }
            }
            catch (error) {
                console.error('Error loading saved items:', error);
            }
        });
    }
    // Save items to storage
    function saveItems() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield figma.clientStorage.setAsync('clipboardItems', clipboardItems);
            }
            catch (error) {
                console.error('Error saving items:', error);
            }
        });
    }
    // Load saved items when plugin starts
    loadSavedItems();
    figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
        if (msg.type === 'clear-clipboard') {
            clipboardItems = [];
            yield saveItems();
            figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
        }
        if (msg.type === 'paste-text' && msg.content) {
            const content = msg.content;
            // Get the currently selected nodes
            const selection = figma.currentPage.selection;
            const textNodes = selection.filter(node => node.type === 'TEXT');
            // Replace content of the first selected text node if any
            if (textNodes.length > 0) {
                const firstTextNode = textNodes[0];
                firstTextNode.characters = content;
            }
            else {
                // If no text nodes are selected, create a new text node
                const newTextNode = figma.createText();
                newTextNode.characters = content;
                figma.currentPage.appendChild(newTextNode);
                figma.currentPage.selection = [newTextNode];
                figma.viewport.scrollAndZoomIntoView([newTextNode]);
            }
        }
    });
    figma.on('selectionchange', () => __awaiter(void 0, void 0, void 0, function* () {
        const selection = figma.currentPage.selection;
        let newItems = [];
        for (const node of selection) {
            // If it's a frame or group, look for text nodes inside
            if (node.type === 'FRAME' || node.type === 'GROUP') {
                const textNodes = node.findAll(n => n.type === 'TEXT');
                for (const textNode of textNodes) {
                    yield figma.loadFontAsync(textNode.fontName);
                    newItems.push(textNode.characters);
                }
            }
            // If it's a text node directly
            else if (node.type === 'TEXT' && node.characters.trim() !== '') {
                yield figma.loadFontAsync(node.fontName);
                newItems.push(node.characters);
            }
        }
        // Add new items to the beginning of the array
        clipboardItems = [...newItems, ...clipboardItems];
        // Keep only the last MAX_CLIPBOARD_ITEMS items
        if (clipboardItems.length > MAX_CLIPBOARD_ITEMS) {
            clipboardItems = clipboardItems.slice(0, MAX_CLIPBOARD_ITEMS);
        }
        // Save to storage and update UI
        yield saveItems();
        figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
    }));
}
