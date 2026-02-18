import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useIntersectionObserver } from '@uidotdev/usehooks';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderSrc?: string;
  className?: string;
  wrapperClassName?: string;
}

export function LazyImage({
  src,
  alt,
  placeholderSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ELoading...%3C/text%3E%3C/svg%3E',
  className,
  wrapperClassName,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholderSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgRef, entry] = useIntersectionObserver({
    threshold: 0.01,
    rootMargin: '50px',
  });
  
  const isInView = entry?.isIntersecting ?? false;

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
  }, [src, isInView]);

  return (
    <div className={cn('relative overflow-hidden bg-white/[0.06]', wrapperClassName)}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-50',
          className
        )}
        loading="lazy"
        {...props}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
        </div>
      )}
    </div>
  );
}
