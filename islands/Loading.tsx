import { useEffect, useState } from "preact/hooks";

export default function Loading({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(true), 100);
    return () => clearTimeout(timer);
  }, [path]);

  return loading ? <div class="loading">Loading {path}...</div> : null;
}
