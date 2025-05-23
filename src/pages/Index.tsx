
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Shuffle, Import, SortAsc, SortDesc, Columns, RotateCcw, Moon, Sun, Maximize, Minimize } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
  dateModified: number;
}

type SortCriteria = 'name' | 'date' | 'size' | 'type';
type SortOrder = 'asc' | 'desc';

const Index = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isShuffled, setIsShuffled] = useState(false);
  const [columnCount, setColumnCount] = useState(5);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const { toast } = useToast();

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
      // Don't trigger if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
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
  }, [images.length, isFullscreen]);

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
    setIsShuffled(false);
    setSortCriteria('name');
    setSortOrder('asc');
    setColumnCount(5);
    
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

  const sortedImages = useMemo(() => {
    if (isShuffled) {
      return [...images];
    }
    
    const sorted = [...images].sort((a, b) => {
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
  }, [images, sortCriteria, sortOrder, isShuffled]);

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
          {sortedImages.length === 0 ? (
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
                  <h3 className="text-xl font-semibold mb-2">No images imported</h3>
                  <p>Press "I" or drag & drop images to get started</p>
                </div>
              </Card>
            </div>
          ) : (
            <div 
              className="gap-4" 
              style={{ 
                columnCount: columnCount, 
                columnGap: '1rem',
                columnFill: 'balance'
              }}
            >
              {sortedImages.map((image, index) => (
                <Card 
                  key={image.id} 
                  className={`mb-4 break-inside-avoid shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-0 ${
                    isDarkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white'
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
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
        <Card className={`p-4 mb-8 border-0 shadow-lg backdrop-blur-sm ${
          isDarkMode ? 'bg-gray-800/80 text-white' : 'bg-white/80'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                onClick={handleImportImages}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Import size={20} />
                Import Images
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
                Shuffle
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
                Reset
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
                Fullscreen
              </Button>

              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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

              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium whitespace-nowrap flex items-center gap-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <Columns size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  Columns:
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
            </div>

            {/* Dark mode toggle moved to the right */}
            <div className="flex items-center gap-2 ml-auto">
              <Sun size={20} className={isDarkMode ? 'text-gray-400' : 'text-yellow-500'} />
              <Switch 
                checked={isDarkMode} 
                onCheckedChange={setIsDarkMode}
                className="data-[state=checked]:bg-blue-600"
              />
              <Moon size={20} className={isDarkMode ? 'text-blue-400' : 'text-gray-400'} />
            </div>
            
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {images.length} images
            </div>
          </div>
        </Card>

        {/* Gallery */}
        {sortedImages.length === 0 ? (
          <Card className={`p-12 text-center border-2 border-dashed backdrop-blur-sm ${
            isDarkMode 
              ? 'bg-gray-800/60 border-gray-600 text-gray-300' 
              : 'bg-white/60 border-gray-300 text-gray-500'
          }`}>
            <div>
              <Import size={48} className={`mx-auto mb-4 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <h3 className="text-xl font-semibold mb-2">No images imported</h3>
              <p>Click "Import Images", press "I", or drag & drop images to get started</p>
            </div>
          </Card>
        ) : (
          <div 
            className="gap-4" 
            style={{ 
              columnCount: columnCount, 
              columnGap: '1rem',
              columnFill: 'balance'
            }}
          >
            {sortedImages.map((image, index) => (
              <Card 
                key={image.id} 
                className={`mb-4 break-inside-avoid shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-0 ${
                  isDarkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white'
                }`}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
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
