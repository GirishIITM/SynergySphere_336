import { useState, useEffect } from "react";
/**
 * This hook fix hydration when use persist to save hook data to localStorage
 */
export const useStore = (store, callback) => {
  const result = store(callback);
  const [data, setData] = useState();

  useEffect(() => {
    setData(result);
  }, [result]);

  return data;
};
