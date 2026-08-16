import { locales } from './locales';

let observer = null;
let currentTranslationMap = new Map();

function buildTranslationMap(targetLang) {
  const map = new Map();
  const english = locales.en;
  const target = locales[targetLang];
  if (!target) return map;

  const traverse = (engObj, tgtObj) => {
    if (typeof engObj === 'string' && typeof tgtObj === 'string') {
      const trimmedEng = engObj.trim();
      if (trimmedEng) {
        map.set(trimmedEng, tgtObj);
      }
      return;
    }
    if (typeof engObj === 'object' && engObj !== null && typeof tgtObj === 'object' && tgtObj !== null) {
      for (const key in engObj) {
        if (Object.prototype.hasOwnProperty.call(engObj, key) && Object.prototype.hasOwnProperty.call(tgtObj, key)) {
          traverse(engObj[key], tgtObj[key]);
        }
      }
    }
  };

  traverse(english, target);
  return map;
}

export async function translateDOM(targetLang) {
  if (!targetLang || targetLang === 'en') {
    if (localStorage.getItem('et-lang') !== 'en') {
      localStorage.setItem('et-lang', 'en');
      window.location.reload();
    }
    return;
  }

  console.log(`[Offline Translation] Translating DOM labels to ${targetLang}...`);
  currentTranslationMap = buildTranslationMap(targetLang);

  const root = document.getElementById('root');
  if (!root) return;

  const walk = (node) => {
    if (['SCRIPT', 'STYLE', 'IFRAME', 'NOSCRIPT'].includes(node.nodeName)) {
      return;
    }
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue.trim();
      if (text) {
        const translated = currentTranslationMap.get(text);
        if (translated && translated !== text) {
          const leadingSpace = node.nodeValue.match(/^\s*/)[0];
          const trailingSpace = node.nodeValue.match(/\s*$/)[0];
          node.nodeValue = leadingSpace + translated + trailingSpace;
        }
      }
    } else {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        walk(child);
      }
    }
  };

  walk(root);
}

export function startTranslationObserver(targetLang) {
  if (observer) observer.disconnect();
  if (!targetLang || targetLang === 'en') return;

  if (currentTranslationMap.size === 0) {
    currentTranslationMap = buildTranslationMap(targetLang);
  }

  const root = document.getElementById('root');
  if (!root) return;

  const translateNode = (node) => {
    const text = node.nodeValue.trim();
    if (!text) return;
    const translated = currentTranslationMap.get(text);
    if (translated && translated !== text) {
      const leadingSpace = node.nodeValue.match(/^\s*/)[0];
      const trailingSpace = node.nodeValue.match(/\s*$/)[0];
      node.nodeValue = leadingSpace + translated + trailingSpace;
    }
  };

  observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateNode(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            let textNode;
            while (textNode = walker.nextNode()) {
              translateNode(textNode);
            }
          }
        });
      } else if (mutation.type === 'characterData') {
        const node = mutation.target;
        translateNode(node);
      }
    });
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
