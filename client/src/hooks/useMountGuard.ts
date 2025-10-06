import { useEffect, useState } from 'react';

export const useMountGuard = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
};
