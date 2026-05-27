/**
 * Hinglish Translator & Reader — Background Script (Bug-Fixed)
 * Handles: context menus (deduped), keyboard shortcuts, tab messaging
 */

// Track if menus are already created to avoid duplicates on update
let menusCreated = false;

browser.runtime.onInstalled.addListener(() => {
  if (menusCreated) return;
  menusCreated = true;

  const menuItems = [
    { id: 'translate-page', title: 'Translate to Hinglish', contexts: ['page', 'selection'] },
    { id: 'read-aloud', title: 'Read Aloud (Hinglish)', contexts: ['page', 'selection'] },
    { id: 'stop-reading', title: 'Stop Reading', contexts: ['page'] }
  ];

  menuItems.forEach(item => {
    browser.contextMenus.create(item).catch(err => {
      // Ignore "already exists" errors
      if (!err.message.includes('already exists')) console.error('Menu error:', err);
    });
  });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  const tabId = tab.id;

  switch (info.menuItemId) {
    case 'translate-page':
      browser.tabs.sendMessage(tabId, { action: 'translate' }).catch(() => {});
      break;
    case 'read-aloud':
      if (info.selectionText) {
        browser.tabs.sendMessage(tabId, { action: 'speak', text: info.selectionText }).catch(() => {});
      } else {
        browser.tabs.sendMessage(tabId, { action: 'speak' }).catch(() => {});
      }
      break;
    case 'stop-reading':
      browser.tabs.sendMessage(tabId, { action: 'stop' }).catch(() => {});
      break;
  }
});

// Keyboard shortcuts
browser.commands.onCommand.addListener((command) => {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs[0] && tabs[0].id) {
      const tabId = tabs[0].id;
      switch (command) {
        case 'translate-page':
          browser.tabs.sendMessage(tabId, { action: 'translate' }).catch(() => {});
          break;
        case 'read-aloud':
          browser.tabs.sendMessage(tabId, { action: 'speak' }).catch(() => {});
          break;
        case 'stop-reading':
          browser.tabs.sendMessage(tabId, { action: 'stop' }).catch(() => {});
          break;
      }
    }
  });
});
