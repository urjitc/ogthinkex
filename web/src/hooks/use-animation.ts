import { useState, useEffect, useRef } from 'react';

export const useAnimation = (items: any[], dependencies: any[], isLoading: boolean) => {
  const [animatedItems, setAnimatedItems] = useState<{ [key: string]: string }>({});
  const [scrollToItemId, setScrollToItemId] = useState<string | null>(null);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    // If data is still loading, do nothing. This prevents the hook from running with empty or partial data.
    if (isLoading) {
      return;
    }

    // Do nothing if the items are not yet loaded.
    if (items.length === 0 && isInitialLoad.current) {
      return;
    }

    // If it's the first time we have items, just populate sessionStorage and do not animate.
    if (items.length > 0 && isInitialLoad.current) {
      const itemsToStore: { [key: string]: any } = {};
      items.forEach(item => {
        itemsToStore[item._id] = item;
      });
      sessionStorage.setItem('previousItems', JSON.stringify(itemsToStore));
      isInitialLoad.current = false;
      return;
    }


    const newAnimatedItems: { [key: string]: string } = {};
    const previousItems = JSON.parse(sessionStorage.getItem('previousItems') || '{}');
    const currentItems: { [key: string]: any } = {};
    let firstNewId: string | null = null;
    let firstUpdatedId: string | null = null;

    items.forEach(item => {
      currentItems[item._id] = item;
      if (!previousItems[item._id]) {
        newAnimatedItems[item._id] = 'new';
        if (!firstNewId) {
          firstNewId = item._id;
        }
      } else if (JSON.stringify(previousItems[item._id]) !== JSON.stringify(item)) {
        newAnimatedItems[item._id] = 'updated';
        if (!firstUpdatedId) {
          firstUpdatedId = item._id;
        }
      }
    });

    setAnimatedItems(newAnimatedItems);
    setScrollToItemId(firstNewId || firstUpdatedId);

    const itemsToStore: { [key: string]: any } = {};
    items.forEach(item => {
      itemsToStore[item._id] = item;
    });
    sessionStorage.setItem('previousItems', JSON.stringify(itemsToStore));

  }, dependencies);

  return { animatedItems, scrollToItemId };
};
