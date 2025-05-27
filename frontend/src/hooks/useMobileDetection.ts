import { useState, useEffect } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

export const useMobileDetection = () => {
  const theme = useTheme();
  const isMobileBreakpoint = useMediaQuery(theme.breakpoints.down('md'));
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = [
        'android', 'webos', 'iphone', 'ipad', 'ipod',
        'blackberry', 'windows phone', 'mobile'
      ];

      const isMobileDevice = mobileKeywords.some(keyword =>
        userAgent.includes(keyword)
      );

      const isSmallScreen = window.innerWidth <= 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setIsMobile(isMobileDevice || (isSmallScreen && isTouchDevice) || isMobileBreakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, [isMobileBreakpoint]);

  return isMobile;
};
