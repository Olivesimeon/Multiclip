// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

if (figma.editorType === 'figma') {
  figma.showUI(__html__, { width: 320, height: 400 });

  const MAX_CLIPBOARD_ITEMS = 10;
  let clipboardItems: string[] = [];

  // Load saved items when plugin starts
  async function loadSavedItems() {
    try {
      const savedItems = await figma.clientStorage.getAsync('clipboardItems');
      if (savedItems && Array.isArray(savedItems)) {
        clipboardItems = savedItems;
        figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  }

  // Save items to storage
  async function saveItems() {
    try {
      await figma.clientStorage.setAsync('clipboardItems', clipboardItems);
    } catch (error) {
      console.error('Error saving items:', error);
    }
  }

  // Load saved items when plugin starts
  loadSavedItems();

  figma.ui.onmessage = async (msg: { type: string, count?: number, content?: string }) => {
    if (msg.type === 'clear-clipboard') {
      clipboardItems = [];
      await saveItems();
      figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
    }

    if (msg.type === 'paste-content' && msg.content) {
      const content = msg.content;

      // Get the currently selected nodes
      const selection = figma.currentPage.selection;
      const textNodes = selection.filter(node => node.type === 'TEXT') as TextNode[];

      // Replace content of the first selected text node if any
      if (textNodes.length > 0) {
        const firstTextNode = textNodes[0];
        firstTextNode.characters = content;
      } else {
        // If no text nodes are selected, create a new text node
        const newTextNode = figma.createText();
        newTextNode.characters = content;
        figma.currentPage.appendChild(newTextNode);
        figma.currentPage.selection = [newTextNode];
        figma.viewport.scrollAndZoomIntoView([newTextNode]);
      }
    }
  };

  figma.on('selectionchange', async () => {
    const selection = figma.currentPage.selection;
    let newItems: string[] = [];
    
    for (const node of selection) {
      // If it's a frame or group, look for text nodes inside
      if (node.type === 'FRAME' || node.type === 'GROUP') {
        const textNodes = node.findAll(n => n.type === 'TEXT') as TextNode[];
        for (const textNode of textNodes) {
          await figma.loadFontAsync(textNode.fontName as FontName);
          newItems.push(textNode.characters);
        }
      }
      // If it's a text node directly
      else if (node.type === 'TEXT') {
        await figma.loadFontAsync(node.fontName as FontName);
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
    await saveItems();
    figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
  });
}
