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
        updateUI();
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  }

  // Save clipboard items to persistent storage
  async function saveItems() {
    try {
      await figma.clientStorage.setAsync('clipboardItems', clipboardItems);
    } catch (error) {
      console.error('Error saving items:', error);
    }
  }

  // Update the plugin UI
  function updateUI() {
    figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
  }

  // Intercept native copy event
  figma.on('copy', async () => {
    const selection = figma.currentPage.selection;
    let copiedTexts: string[] = [];

    for (const node of selection) {
      if (node.type === 'TEXT') {
        await figma.loadFontAsync(node.fontName as FontName);
        copiedTexts.push(node.characters);
      }
    }

    if (copiedTexts.length > 0) {
      clipboardItems = [...copiedTexts, ...clipboardItems].slice(0, MAX_CLIPBOARD_ITEMS);
      await saveItems();
      updateUI();
    }
  });

  // Intercept native paste event
  figma.on('paste', async () => {
    if (clipboardItems.length === 0) return;

    const content = clipboardItems[0]; // Paste the most recent copied item
    const selection = figma.currentPage.selection;

    if (selection.length > 0) {
      for (const node of selection) {
        if (node.type === 'TEXT') {
          await figma.loadFontAsync(node.fontName as FontName);
          node.characters = content;
        }
      }
    } else {
      // Create a new text node if nothing is selected
      const newTextNode = figma.createText();
      await figma.loadFontAsync(newTextNode.fontName as FontName);
      newTextNode.characters = content;
      figma.currentPage.appendChild(newTextNode);
      figma.currentPage.selection = [newTextNode];
      figma.viewport.scrollAndZoomIntoView([newTextNode]);
    }
  });

  // Handle UI messages
  figma.ui.onmessage = async (msg: { type: string; content?: string }) => {
    if (msg.type === 'clear-clipboard') {
      clipboardItems = [];
      await saveItems();
      updateUI();
    }

    if (msg.type === 'remove-item' && msg.content) {
      clipboardItems = clipboardItems.filter(item => item !== msg.content);
      await saveItems();
      updateUI();
    }
  };

  // Load saved items on startup
  loadSavedItems();
}
