
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploaderProps {
  onUpload: (files: File[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUpload }) => {
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      // Simulate upload progress
      const fileId = `${file.name}-${Date.now()}`;
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[fileId] || 0;
          const newProgress = currentProgress + Math.random() * 20;
          
          if (newProgress >= 100) {
            clearInterval(interval);
            setUploadedFiles(prevFiles => [...prevFiles, file]);
            onUpload([file]);
            
            // Remove from progress tracking
            setTimeout(() => {
              setUploadProgress(prev => {
                const { [fileId]: removed, ...rest } = prev;
                return rest;
              });
            }, 1000);
            
            return { ...prev, [fileId]: 100 };
          }
          
          return { ...prev, [fileId]: newProgress };
        });
      }, 100);
    });
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/markdown': ['.md'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(prev => prev.filter(file => file !== fileToRemove));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        {isDragActive ? (
          <p className="text-blue-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-1">
              Drag & drop study materials here, or click to select
            </p>
            <p className="text-xs text-gray-500">
              PDF, DOC, TXT, MD, or image files (max 10MB each)
            </p>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Uploading...</h4>
          {Object.entries(uploadProgress).map(([fileId, progress]) => {
            const fileName = fileId.split('-').slice(0, -1).join('-');
            return (
              <div key={fileId} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="truncate">{fileName}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            );
          })}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center">
            <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
            Uploaded Files
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded border border-green-200">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <File className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-green-800 truncate">{file.name}</p>
                    <p className="text-xs text-green-600">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file)}
                  className="text-green-600 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
