// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

if (figma.editorType === 'figma') {
  figma.showUI(__html__, { width: 320, height: 400 });

  let clipboardItems: string[] = [];

  figma.ui.onmessage = (msg: { type: string, count?: number, content?: string }) => {
    if (msg.type === 'clear-clipboard') {
      clipboardItems = [];
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

  figma.on('selectionchange', () => {
    const selection = figma.currentPage.selection;
    clipboardItems = selection.map(node => {
      if (node.type === 'TEXT') {
        return (node as TextNode).characters;
      } else {
        return `Unsupported type: ${node.type}`;
      }
    });

    figma.ui.postMessage({ type: 'update-clipboard', items: clipboardItems });
  });
}
