import { useState } from "react";

const useDebounce = () => {
  const [debounceId, setDebounceId] = useState<NodeJS.Timeout | null>(null);

  const debouncedUpdate = async (func: () => Promise<void>) => {
    if (debounceId) {
      clearInterval(debounceId);
    }

    const id = setTimeout(async () => {
      await func();
      setDebounceId(null);
    }, 2500);
    setDebounceId(id);
  };

  return { debouncedUpdate };
};

export default useDebounce;
