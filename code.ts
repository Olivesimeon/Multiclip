// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

if (figma.editorType === 'figma') {
  figma.showUI(__html__, { width: 320, height: 500 });

  const MAX_CLIPBOARD_ITEMS = 10;
  let clipboardItems: string[] = [];

  async function loadSavedItems() {
    try {
      const savedItems = await figma.clientStorage.getAsync('clipboardItems');
      if (Array.isArray(savedItems)) {
        clipboardItems = savedItems;
        figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  }

  async function saveItems() {
    try {
      await figma.clientStorage.setAsync('clipboardItems', clipboardItems);
    } catch (error) {
      console.error('Error saving items:', error);
    }
  }

  loadSavedItems();

  figma.ui.onmessage = async (msg: { type: string; content?: string }) => {
    console.log('msg', msg);
    if (msg.type === 'clear-clipboard') {
      clipboardItems = [];
      await saveItems();
      figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
    }
    
    if (msg.type === 'paste-text' && msg.content) {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" }); // Ensure font is loaded
      const selection = figma.currentPage.selection;
      const textNodes = selection.filter(node => node.type === 'TEXT') as TextNode[];

      if (textNodes.length > 0) {
        textNodes[0].characters = msg.content;
      } else {
        const newTextNode = figma.createText();
        await figma.loadFontAsync(newTextNode.fontName as FontName);
        newTextNode.characters = msg.content;
        figma.currentPage.appendChild(newTextNode);
        figma.currentPage.selection = [newTextNode];
        figma.viewport.scrollAndZoomIntoView([newTextNode]);
      }
    }
    if (msg.type === "add-to-clipboard" && msg.content){
      const selection = msg.content;
    let newItems: string[] = [];

      if (selection.trim() !== '') {
        newItems.push(selection);
      }
  
    if (newItems.length > 0) {
      clipboardItems = [...newItems, ...clipboardItems].slice(0, MAX_CLIPBOARD_ITEMS);
      await saveItems();
      figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
    }
    }
  };

  figma.on('selectionchange', async () => {
    const selection = figma.currentPage.selection;
    let newItems: string[] = [];

    for (const node of selection) {
      if (node.type === 'TEXT' && node.characters.trim() !== '') {
        await figma.loadFontAsync(node.fontName as FontName);
        newItems.push(node.characters);
      }
    }

    if (newItems.length > 0) {
      clipboardItems = [...newItems, ...clipboardItems].slice(0, MAX_CLIPBOARD_ITEMS);
      await saveItems();
      figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
    }
  });
}
