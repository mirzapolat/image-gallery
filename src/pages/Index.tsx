import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Shuffle, Import, SortAsc, SortDesc, Columns, RotateCcw, Moon, Sun, Maximize, Minimize, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import ImagePreview from '@/components/ImagePreview';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
  dateModified: number;
}

interface ImageWithDimensions extends ImageFile {
  width: number;
  height: number;
  aspectRatio: number;
}

interface PositionedImage extends ImageWithDimensions {
  column: number;
  top: number;
  calculatedHeight: number;
  calculatedWidth: number;
}

type SortCriteria = 'name' | 'date' | 'size' | 'type';
type SortOrder = 'asc' | 'desc';

const Index = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [imagesWithDimensions, setImagesWithDimensions] = useState<ImageWithDimensions[]>([]);
  const [positionedImages, setPositionedImages] = useState<PositionedImage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isShuffled, setIsShuffled] = useState(false);
  const [columnCount, setColumnCount] = useState(5);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const { toast } = useToast();

  // Load image dimensions
  const loadImageDimensions = useCallback((imageFile: ImageFile): Promise<ImageWithDimensions> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          ...imageFile,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
        });
      };
      img.onerror = () => {
        // Fallback for images that fail to load
        resolve({
          ...imageFile,
          width: 300,
          height: 200,
          aspectRatio: 1.5,
        });
      };
      img.src = imageFile.url;
    });
  }, []);

  // Update images with dimensions when images change
  useEffect(() => {
    const loadDimensions = async () => {
      if (images.length === 0) {
        setImagesWithDimensions([]);
        return;
      }

      const imagesWithDims = await Promise.all(
        images.map(loadImageDimensions)
      );
      setImagesWithDimensions(imagesWithDims);
    };

    loadDimensions();
  }, [images, loadImageDimensions]);

  // Filter images based on search term
  const filteredImages = useMemo(() => {
    if (!searchTerm.trim()) {
      return imagesWithDimensions;
    }
    return imagesWithDimensions.filter(image => 
      image.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [imagesWithDimensions, searchTerm]);

  // Calculate sortedImages using filtered images
  const sortedImages = useMemo(() => {
    if (isShuffled) {
      return [...filteredImages];
    }
    
    const sorted = [...filteredImages].sort((a, b) => {
      let comparison = 0;
      
      switch (sortCriteria) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = a.dateModified - b.dateModified;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredImages, sortCriteria, sortOrder, isShuffled]);

  // Calculate waterfall layout positions with dynamic sizing
  const calculateWaterfallLayout = useCallback((images: ImageWithDimensions[], columnCount: number): PositionedImage[] => {
    if (images.length === 0) return [];

    const gap = 16; // consistent gap between images both horizontally and vertically
    
    // Calculate container width based on actual viewport and padding
    let containerMaxWidth;
    if (isFullscreen) {
      containerMaxWidth = window.innerWidth - 32; // fullscreen with padding
    } else {
      // For normal mode, use the actual available width considering max-w-7xl constraint
      const viewportWidth = window.innerWidth;
      const maxContainerWidth = 1280; // max-w-7xl
      const actualMaxWidth = Math.min(viewportWidth - 32, maxContainerWidth); // 32px for padding
      containerMaxWidth = actualMaxWidth;
    }
    
    const availableWidth = containerMaxWidth - (gap * (columnCount - 1));
    const imageWidth = Math.floor(availableWidth / columnCount);

    const columnHeights = new Array(columnCount).fill(0);

    return images.map((image) => {
      // Find the column with the smallest height
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      // Calculate the height this image will take based on its aspect ratio and the dynamic width
      const calculatedHeight = Math.round(imageWidth / image.aspectRatio);
      // Remove the arbitrary 32px padding - let the actual card determine its own height
      const totalCardHeight = calculatedHeight;
      
      const positionedImage: PositionedImage = {
        ...image,
        column: shortestColumnIndex,
        top: columnHeights[shortestColumnIndex],
        calculatedHeight: totalCardHeight,
        calculatedWidth: imageWidth,
      };

      // Update the column height - add gap for consistent spacing that matches horizontal gaps
      columnHeights[shortestColumnIndex] += totalCardHeight + gap;

      return positionedImage;
    });
  }, [isFullscreen]);

  // Update positioned images when sorted images or column count changes
  useEffect(() => {
    const positioned = calculateWaterfallLayout(sortedImages, columnCount);
    setPositionedImages(positioned);
  }, [sortedImages, columnCount, calculateWaterfallLayout]);

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Hotkeys
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or if preview is open
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || isPreviewOpen) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'i':
          event.preventDefault();
          handleImportImages();
          break;
        case 's':
          event.preventDefault();
          if (images.length > 0) {
            shuffleImages();
          }
          break;
        case 'r':
          event.preventDefault();
          handleReset();
          break;
        case 'f':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 'd':
          event.preventDefault();
          setIsDarkMode(prev => !prev);
          break;
        case 'escape':
          if (isFullscreen) {
            event.preventDefault();
            setIsFullscreen(false);
          }
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          event.preventDefault();
          setColumnCount(parseInt(event.key));
          break;
        case '0':
          event.preventDefault();
          setColumnCount(10);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [images.length, isFullscreen, isPreviewOpen]);

  // Improved drag and drop functionality with proper event handling
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current++;
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;
    
    const files = event.dataTransfer.files;
    if (!files) return;

    const imageFiles: ImageFile[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const imageFile: ImageFile = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type,
          dateModified: file.lastModified,
        };
        imageFiles.push(imageFile);
      }
    });

    if (imageFiles.length > 0) {
      setImages(prev => [...prev, ...imageFiles]);
      setIsShuffled(false);
      toast({
        title: "Images added",
        description: `Successfully added ${imageFiles.length} images via drag & drop`,
      });
    }
  }, [toast]);

  const handleImportImages = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles: ImageFile[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const imageFile: ImageFile = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type,
          dateModified: file.lastModified,
        };
        imageFiles.push(imageFile);
      }
    });

    setImages(prev => [...prev, ...imageFiles]);
    setIsShuffled(false);
    toast({
      title: "Images imported",
      description: `Successfully imported ${imageFiles.length} images`,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [toast]);

  // Optimized shuffle function using Fisher-Yates algorithm
  const shuffleImages = useCallback(() => {
    setImages(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setIsShuffled(true);
    toast({
      title: "Images shuffled",
      description: "Gallery order has been randomized",
    });
  }, [toast]);

  const handleReset = useCallback(() => {
    // Clean up object URLs to prevent memory leaks
    images.forEach(image => URL.revokeObjectURL(image.url));
    
    setImages([]);
    setSearchTerm('');
    setIsShuffled(false);
    setSortCriteria('name');
    setSortOrder('asc');
    setColumnCount(5);
    setIsPreviewOpen(false);
    setPreviewIndex(-1);
    
    toast({
      title: "Gallery reset",
      description: "All images have been removed",
    });
  }, [images, toast]);

  const handleColumnCountChange = useCallback((value: number[]) => {
    setColumnCount(value[0]);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const openPreview = useCallback((index: number) => {
    setPreviewIndex(index);
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewIndex(-1);
  }, []);

  const goToNextImage = useCallback(() => {
    if (previewIndex < sortedImages.length - 1) {
      setPreviewIndex(prev => prev + 1);
    }
  }, [previewIndex, sortedImages.length]);

  const goToPreviousImage = useCallback(() => {
    if (previewIndex > 0) {
      setPreviewIndex(prev => prev - 1);
    }
  }, [previewIndex]);

  const downloadImage = useCallback((image: ImageFile) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: `Downloading ${image.name}`,
    });
  }, [toast]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    setIsShuffled(false);
  };

  const handleSortChange = (value: SortCriteria) => {
    setSortCriteria(value);
    setIsShuffled(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const containerHeight = useMemo(() => {
    if (positionedImages.length === 0) return 0;
    
    const columnHeights = new Array(columnCount).fill(0);
    positionedImages.forEach((image) => {
      const newHeight = image.top + image.calculatedHeight;
      if (newHeight > columnHeights[image.column]) {
        columnHeights[image.column] = newHeight;
      }
    });
    
    return Math.max(...columnHeights);
  }, [positionedImages, columnCount]);

  const containerWidth = useMemo(() => {
    if (positionedImages.length === 0) return 0;
    const gap = 16;
    const imageWidth = positionedImages[0]?.calculatedWidth || 300;
    return (imageWidth * columnCount) + (gap * (columnCount - 1));
  }, [positionedImages, columnCount]);

  if (isFullscreen) {
    return (
      <div 
        className={`fixed inset-0 z-50 transition-colors duration-300 p-4 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100'
        } ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="fixed inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center">
            <div className="text-center">
              <Import size={48} className="mx-auto mb-4 text-blue-500" />
              <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">Drop images here</p>
            </div>
          </div>
        )}

        {/* Exit fullscreen button */}
        <Button
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 z-10 bg-black/20 hover:bg-black/40 backdrop-blur-sm border-0"
          size="sm"
        >
          <Minimize size={16} />
        </Button>

        {/* Gallery only */}
        <div className="h-full overflow-auto">
          {positionedImages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Card className={`p-12 text-center border-2 border-dashed backdrop-blur-sm ${
                isDarkMode 
                  ? 'bg-gray-800/60 border-gray-600 text-gray-300' 
                  : 'bg-white/60 border-gray-300 text-gray-500'
              }`}>
                <div>
                  <Import size={48} className={`mx-auto mb-4 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <h3 className="text-xl font-semibold mb-2">No images found</h3>
                  <p>{searchTerm ? 'No images match your search' : 'Press "I" or drag & drop images to get started'}</p>
                </div>
              </Card>
            </div>
          ) : (
            <div 
              className="relative mx-auto"
              style={{ 
                height: `${containerHeight}px`,
                width: `${containerWidth}px`
              }}
            >
              {positionedImages.map((image, index) => (
                <Card 
                  key={image.id} 
                  className={`absolute break-inside-avoid shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-0 cursor-pointer ${
                    isDarkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white'
                  }`}
                  style={{
                    left: `${image.column * (image.calculatedWidth + 16)}px`,
                    top: `${image.top}px`,
                    width: `${image.calculatedWidth}px`,
                    animationDelay: `${index * 50}ms`
                  }}
                  onClick={() => openPreview(index)}
                >
                  <div className="relative group">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4">
                      <p className="text-white text-sm font-medium truncate">{image.name}</p>
                      <p className="text-white/80 text-xs">{formatFileSize(image.size)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Image Preview */}
        <ImagePreview
          images={sortedImages}
          currentIndex={previewIndex}
          isOpen={isPreviewOpen}
          onClose={closePreview}
          onNext={goToNextImage}
          onPrevious={goToPreviousImage}
          onDownload={downloadImage}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 p-4 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
          : 'bg-gradient-to-br from-gray-50 to-gray-100'
      } ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="max-w-7xl mx-auto">
        {/* Drag overlay */}
        {isDragOver && (
          <div className="fixed inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center">
            <div className="text-center">
              <Import size={48} className="mx-auto mb-4 text-blue-500" />
              <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">Drop images here</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <Card className={`p-4 mb-4 border-0 shadow-lg backdrop-blur-sm ${
          isDarkMode ? 'bg-gray-800/80 text-white' : 'bg-white/80'
        }`}>
          <div className="space-y-4">
            {/* First Row: Main Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  onClick={handleImportImages}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Import size={20} />
                  <span className="hidden sm:inline">Import Images</span>
                </Button>
                
                <Button 
                  onClick={shuffleImages}
                  disabled={images.length === 0}
                  variant="outline"
                  className={`flex items-center gap-2 ${
                    isDarkMode 
                      ? 'border-purple-400 hover:border-purple-300 hover:bg-purple-900/50 text-white' 
                      : 'border-purple-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <Shuffle size={20} />
                  <span className="hidden sm:inline">Shuffle</span>
                </Button>

                <Button 
                  onClick={handleReset}
                  disabled={images.length === 0}
                  variant="outline"
                  className={`flex items-center gap-2 ${
                    isDarkMode 
                      ? 'border-red-400 hover:border-red-300 hover:bg-red-900/50 text-white' 
                      : 'border-red-200 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  <RotateCcw size={20} />
                  <span className="hidden sm:inline">Reset</span>
                </Button>

                <Button 
                  onClick={toggleFullscreen}
                  variant="outline"
                  className={`flex items-center gap-2 ${
                    isDarkMode 
                      ? 'border-green-400 hover:border-green-300 hover:bg-green-900/50 text-white' 
                      : 'border-green-200 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <Maximize size={20} />
                  <span className="hidden sm:inline">Fullscreen</span>
                </Button>

                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium hidden sm:inline ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Sort by:
                  </span>
                  <Select value={sortCriteria} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="size">Size</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={toggleSortOrder}
                    variant="outline"
                    size="sm"
                    className="p-2"
                  >
                    {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                  </Button>
                </div>
              </div>

              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {images.length} images
              </div>
            </div>

            {/* Second Row: Sliders and Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Column Count Slider - Left */}
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium whitespace-nowrap flex items-center gap-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <Columns size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  <span className="hidden sm:inline">Columns:</span>
                </span>
                <div className="w-32">
                  <Slider 
                    defaultValue={[columnCount]} 
                    min={1} 
                    max={10} 
                    step={1}
                    onValueChange={handleColumnCountChange}
                    value={[columnCount]}
                  />
                </div>
                <span className={`text-xs w-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {columnCount}
                </span>
              </div>

              {/* Dark Mode Toggle Button - Right */}
              <Button
                onClick={() => setIsDarkMode(!isDarkMode)}
                variant="outline"
                size="sm"
                className={`flex items-center gap-2 ${
                  isDarkMode 
                    ? 'border-blue-400 hover:border-blue-300 hover:bg-blue-900/50 text-white' 
                    : 'border-yellow-200 hover:border-yellow-300 hover:bg-yellow-50'
                }`}
              >
                {isDarkMode ? (
                  <>
                    <Moon size={16} className="text-blue-400" />
                    <span className="hidden sm:inline">Dark</span>
                  </>
                ) : (
                  <>
                    <Sun size={16} className="text-yellow-500" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Search Box */}
        <Card className={`p-4 mb-8 border-0 shadow-lg backdrop-blur-sm ${
          isDarkMode ? 'bg-gray-800/80 text-white' : 'bg-white/80'
        }`}>
          <div className="flex items-center gap-2">
            <Search size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
            <Input
              type="text"
              placeholder="Search images by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`flex-1 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400' 
                  : 'bg-white border-gray-300'
              }`}
            />
            {searchTerm && (
              <Button
                onClick={() => setSearchTerm('')}
                variant="outline"
                size="sm"
                className={`${
                  isDarkMode 
                    ? 'border-gray-600 hover:bg-gray-700 text-white' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                Clear
              </Button>
            )}
          </div>
          {searchTerm && (
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Showing {sortedImages.length} of {images.length} images
            </p>
          )}
        </Card>

        {/* Gallery */}
        {positionedImages.length === 0 ? (
          <Card className={`p-12 text-center border-2 border-dashed backdrop-blur-sm ${
            isDarkMode 
              ? 'bg-gray-800/60 border-gray-600 text-gray-300' 
              : 'bg-white/60 border-gray-300 text-gray-500'
          }`}>
            <div>
              <Import size={48} className={`mx-auto mb-4 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <h3 className="text-xl font-semibold mb-2">
                {searchTerm ? 'No images found' : 'No images imported'}
              </h3>
              <p>
                {searchTerm 
                  ? 'No images match your search criteria' 
                  : 'Click "Import Images", press "I", or drag & drop images to get started'
                }
              </p>
            </div>
          </Card>
        ) : (
          <div 
            className="relative mx-auto"
            style={{ 
              height: `${containerHeight}px`,
              width: `${containerWidth}px`
            }}
          >
            {positionedImages.map((image, index) => (
              <Card 
                key={image.id} 
                className={`absolute break-inside-avoid shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-0 cursor-pointer ${
                  isDarkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white'
                }`}
                style={{
                  left: `${image.column * (image.calculatedWidth + 16)}px`,
                  top: `${image.top}px`,
                  width: `${image.calculatedWidth}px`,
                  animationDelay: `${index * 50}ms`
                }}
                onClick={() => openPreview(index)}
              >
                <div className="relative group">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4">
                    <p className="text-white text-sm font-medium truncate">{image.name}</p>
                    <p className="text-white/80 text-xs">{formatFileSize(image.size)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Image Preview */}
        <ImagePreview
          images={sortedImages}
          currentIndex={previewIndex}
          isOpen={isPreviewOpen}
          onClose={closePreview}
          onNext={goToNextImage}
          onPrevious={goToPreviousImage}
          onDownload={downloadImage}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default Index;
