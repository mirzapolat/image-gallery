import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shuffle, Import, SortAsc, SortDesc, Columns } from 'lucide-react';
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
  const [isShuffling, setIsShuffling] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [columnCount, setColumnCount] = useState(5); // Default: 5 columns
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    setIsShuffled(false); // Reset shuffle state when adding new images
    toast({
      title: "Images imported",
      description: `Successfully imported ${imageFiles.length} images`,
    });

    // Reset the input value to allow re-importing the same files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [toast]);

  const shuffleImages = useCallback(() => {
    setIsShuffling(true);
    setTimeout(() => {
      setImages(prev => [...prev].sort(() => Math.random() - 0.5));
      setIsShuffled(true);
      setIsShuffling(false);
      toast({
        title: "Images shuffled",
        description: "Gallery order has been randomized",
      });
    }, 300);
  }, [toast]);

  const handleColumnCountChange = useCallback((value: number[]) => {
    setColumnCount(value[0]);
  }, []);

  const sortedImages = useMemo(() => {
    // If images are shuffled, don't apply sorting
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
    setIsShuffled(false); // Reset shuffle state when changing sort order
  };

  const handleSortChange = (value: SortCriteria) => {
    setSortCriteria(value);
    setIsShuffled(false); // Reset shuffle state when changing sort criteria
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Gallery Viewer</h1>
          <p className="text-gray-600">Import and browse your images in a beautiful waterfall layout</p>
        </div>

        {/* Controls */}
        <Card className="p-6 mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <div className="flex flex-wrap items-center gap-4">
            <Button 
              onClick={handleImportImages}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Import size={20} />
              Import Images
            </Button>
            
            <Button 
              onClick={shuffleImages}
              disabled={images.length === 0 || isShuffling}
              variant="outline"
              className="flex items-center gap-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50"
            >
              <Shuffle size={20} className={isShuffling ? 'animate-spin' : ''} />
              Shuffle
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
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

            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap flex items-center gap-1">
                <Columns size={16} className="text-gray-500" />
                Columns:
              </span>
              <div className="w-32">
                <Slider 
                  defaultValue={[columnCount]} 
                  min={3} 
                  max={10} 
                  step={1}
                  onValueChange={handleColumnCountChange}
                />
              </div>
              <span className="text-xs text-gray-500 w-8">{columnCount}</span>
            </div>

            <div className="text-sm text-gray-500 ml-auto">
              {images.length} images
            </div>
          </div>
        </Card>

        {/* Gallery */}
        {sortedImages.length === 0 ? (
          <Card className="p-12 text-center bg-white/60 backdrop-blur-sm border-2 border-dashed border-gray-300">
            <div className="text-gray-500">
              <Import size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2">No images imported</h3>
              <p>Click "Import Images" to select images from your computer</p>
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
                className={`mb-4 break-inside-avoid bg-white shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-0 ${
                  isShuffling ? 'animate-pulse' : ''
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
