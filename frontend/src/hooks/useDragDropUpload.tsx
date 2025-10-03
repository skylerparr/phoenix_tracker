import { useState, useCallback, DragEvent } from "react";
import { uploadService } from "../services/UploadService";
import { FileUpload } from "../models/FileUpload";

interface UseDragDropUploadProps {
  issueId: number;
  onUploadSuccess?: (files: FileUpload[]) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

interface UseDragDropUploadReturn {
  isDragging: boolean;
  isUploading: boolean;
  uploadedFiles: FileUpload[];
  errors: string[];
  handleDragEnter: (e: DragEvent<HTMLElement>) => void;
  handleDragLeave: (e: DragEvent<HTMLElement>) => void;
  handleDragOver: (e: DragEvent<HTMLElement>) => void;
  handleDrop: (e: DragEvent<HTMLElement>) => void;
  handleFileSelect: (files: FileList | null) => void;
  clearErrors: () => void;
  removeUploadedFile: (fileId: number) => void;
}

export const useDragDropUpload = ({
  issueId,
  onUploadSuccess,
  onUploadError,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
}: UseDragDropUploadProps): UseDragDropUploadReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleDragEnter = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set isDragging to false if we're leaving the drop zone entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    if (!currentTarget.contains(relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // This is necessary to allow drop
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const validFiles: File[] = [];
      const validationErrors: string[] = [];

      if (files.length > maxFiles) {
        validationErrors.push(
          `Maximum ${maxFiles} files allowed. You tried to upload ${files.length} files.`,
        );
        return { valid: [], errors: validationErrors };
      }

      files.forEach((file) => {
        // Check file size
        if (file.size > maxFileSize) {
          validationErrors.push(
            `${file.name}: File size exceeds maximum allowed size of ${Math.round(maxFileSize / (1024 * 1024))}MB`,
          );
          return;
        }

        // Use the validation from UploadService
        const validation = uploadService.validateFile(file);
        if (!validation.valid) {
          validationErrors.push(`${file.name}: ${validation.error}`);
          return;
        }

        validFiles.push(file);
      });

      return { valid: validFiles, errors: validationErrors };
    },
    [maxFiles, maxFileSize],
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const { valid: validFiles, errors: validationErrors } =
        validateFiles(files);

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }

      if (validFiles.length === 0) {
        return;
      }

      setIsUploading(true);
      setErrors([]);

      try {
        const uploaded = await uploadService.uploadMultipleForIssue(
          issueId,
          validFiles,
        );
        setUploadedFiles((prev) => [...prev, ...uploaded]);

        if (onUploadSuccess) {
          onUploadSuccess(uploaded);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to upload files";
        setErrors((prev) => [...prev, errorMessage]);

        if (onUploadError) {
          onUploadError(
            error instanceof Error ? error : new Error(errorMessage),
          );
        }
      } finally {
        setIsUploading(false);
      }
    },
    [issueId, validateFiles, onUploadSuccess, onUploadError],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        uploadFiles(fileArray);
      }
    },
    [uploadFiles],
  );

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        uploadFiles(fileArray);
      }
    },
    [uploadFiles],
  );

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const removeUploadedFile = useCallback((fileId: number) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  }, []);

  return {
    isDragging,
    isUploading,
    uploadedFiles,
    errors,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    clearErrors,
    removeUploadedFile,
  };
};
