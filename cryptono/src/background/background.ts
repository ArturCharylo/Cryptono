// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Cryptono extension installed');
});

chrome.action.onClicked.addListener(() => {
  console.log('Extension icon clicked');
});