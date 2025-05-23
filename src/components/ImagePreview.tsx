
import React, { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
  dateModified: number;
}

interface ImagePreviewProps {
  images: ImageFile[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onDownload: (image: ImageFile) => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  onDownload
}) => {
  const currentImage = images[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose, onNext, onPrevious]);

  const handleDownload = useCallback(() => {
    if (currentImage) {
      onDownload(currentImage);
    }
  }, [currentImage, onDownload]);

  if (!isOpen || !currentImage) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close button */}
      <Button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 bg-black/20 hover:bg-black/40 backdrop-blur-sm border-0 text-white"
        size="sm"
      >
        <X size={20} />
      </Button>

      {/* Download button */}
      <Button
        onClick={handleDownload}
        className="fixed top-4 left-4 z-10 bg-black/20 hover:bg-black/40 backdrop-blur-sm border-0 text-white"
        size="sm"
      >
        <Download size={20} />
      </Button>

      {/* Previous button */}
      {currentIndex > 0 && (
        <Button
          onClick={onPrevious}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-10 bg-black/20 hover:bg-black/40 backdrop-blur-sm border-0 text-white"
          size="sm"
        >
          <ChevronLeft size={24} />
        </Button>
      )}

      {/* Next button */}
      {currentIndex < images.length - 1 && (
        <Button
          onClick={onNext}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-10 bg-black/20 hover:bg-black/40 backdrop-blur-sm border-0 text-white"
          size="sm"
        >
          <ChevronRight size={24} />
        </Button>
      )}

      {/* Image */}
      <div className="w-full h-full flex items-center justify-center p-8">
        <img
          src={currentImage.url}
          alt={currentImage.name}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Image info */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-center">
        <p className="text-sm font-medium">{currentImage.name}</p>
        <p className="text-xs text-white/80">
          {currentIndex + 1} of {images.length}
        </p>
      </div>
    </div>
  );
};

export default ImagePreview;
