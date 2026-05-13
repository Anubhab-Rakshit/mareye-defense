"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const prevPathname = useRef(pathname);
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }

    if (pathname !== prevPathname.current) {
      // Route changed — quick fade out then back in
      setIsVisible(false);
      const timeout = setTimeout(() => {
        prevPathname.current = pathname;
        setIsVisible(true);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [pathname]);

  return (
    <div
      className={`transition-opacity duration-300 ease-out ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
