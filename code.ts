"use strict";

if (figma.editorType === "figma") {
  figma.showUI(__html__, { width: 400, height: 560 });

  const MAX_CLIPBOARD_ITEMS = 10;
  let clipboardItems: string[] = [];

  /** Load clipboard items from storage */
  async function loadClipboardItems(): Promise<void> {
    try {
      const savedItems = await figma.clientStorage.getAsync("clipboardItems");
      if (Array.isArray(savedItems)) {
        clipboardItems = savedItems as string[];
        updateUI();
      }
    } catch (error) {
      console.error("Error loading clipboard items:", error);
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

  /** Update UI with clipboard items */
  function updateUI(): void {
    figma.ui.postMessage({ type: "update-clipboard", items: clipboardItems });
  }

  /** Handle messages from UI */
  figma.ui.onmessage = async (msg: any) => {
    if (msg.type === "clear-clipboard") {
      clipboardItems = [];
      await saveClipboardItems();
      updateUI();
    }

    if (msg.type === "paste-text" && msg.content) {
      pasteText(msg.content);
    }

  };


  /** Paste text into the selected node or create a new text node */
  async function pasteText(content: string): Promise<void> {
    const selection = figma.currentPage.selection;
    const textNodes = selection.filter(node => node.type === "TEXT") as TextNode[];

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

  // Load clipboard items on plugin start
  loadClipboardItems();
}
