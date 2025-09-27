import { useEffect, useState } from "react";

export function useResponsive() {
  const [device, setDevice] = useState("desktop");

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < 768) setDevice("mobile");
      else if (width < 1024) setDevice("tablet");
      else setDevice("desktop");
    };
    window.addEventListener("resize", checkDevice);
    checkDevice();
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return {
    isMobile: device === "mobile",
    isTablet: device === "tablet",
    isDesktop: device === "desktop",
    device
  };
}