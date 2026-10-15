import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Client-side redirect for index pages that only existed to call Next.js redirect(). */
export function useRedirect(to: string) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
}
