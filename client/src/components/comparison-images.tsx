import { Card } from '@/components/ui/card';
import { type UploadedFile } from '@/lib/types';

interface ComparisonImagesProps {
  originalFile: UploadedFile;
  newFile: UploadedFile;
}

export function ComparisonImages({ originalFile, newFile }: ComparisonImagesProps) {
  const isImage = (file: UploadedFile) => file.mimeType.startsWith('image/');
  
  if (!isImage(originalFile) || !isImage(newFile)) {
    return null;
  }

  return (
    <div className="my-4 space-y-3">
      <h4 className="text-sm font-medium text-slate-700">Comparison</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Image */}
        <Card className="p-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
              Original: {originalFile.originalName}
            </div>
            <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden">
              <img
                src={`/api/files/${originalFile.id}/content`}
                alt={`Original: ${originalFile.originalName}`}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </Card>
        
        {/* Improved Image */}
        <Card className="p-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-600 bg-green-100 px-2 py-1 rounded">
              Improved: {newFile.originalName}
            </div>
            <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden">
              <img
                src={`/api/files/${newFile.id}/content`}
                alt={`Improved: ${newFile.originalName}`}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}