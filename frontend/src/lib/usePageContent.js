import { useEffect, useState } from 'react';
import { request } from './api';

export default function usePageContent(page, fallback) {
  const [content, setContent] = useState(fallback);

  useEffect(() => {
    const controller = new AbortController();
    request('/pages/' + page, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted && typeof data?.content === 'string') {
          setContent(data.content);
        }
      })
      .catch(() => {
        // Keep the built-in copy if the API is unavailable.
      });

    return () => controller.abort();
  }, [page]);

  return content;
}
