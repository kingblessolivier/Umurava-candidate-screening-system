"use client";
import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface DragDropProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  label?: string;
  description?: string;
}

export function DragDropUpload({
  onFileSelect,
  accept = ".csv,.json,.xlsx",
  maxSize = 10,
  label = "Upload File",
  description = "Drag and drop or click to select",
}: DragDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file type
    const allowedTypes = accept.split(",").map(type => type.trim());
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const mimeType = file.type;

    const isValidType =
      allowedTypes.some(type => fileExtension.includes(type)) ||
      allowedTypes.some(type => mimeType.includes(type));

    if (!isValidType) {
      setError(`Invalid file type. Allowed: ${accept}`);
      return false;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setError(`File too large. Maximum size: ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          backgroundColor: isDragging ? "rgba(59, 130, 246, 0.1)" : "transparent",
          borderColor: isDragging ? "#3b82f6" : "var(--border)",
        }}
        className="relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="text-center">
          {selectedFile ? (
            <>
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}
                  >
                    <FileText className="w-6 h-6 text-green-400" />
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-400 absolute -bottom-1 -right-1" />
                </div>
              </div>
              <p className="text-white font-semibold text-sm mb-1">{selectedFile.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="text-xs mt-2 text-blue-400 hover:text-blue-300 transition"
              >
                Choose different file
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: isDragging ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)",
                  }}
                >
                  <Upload className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <p className="text-white font-semibold">{label}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                {description}
              </p>
              <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                Supported: {accept} • Max {maxSize}MB
              </p>
            </>
          )}
        </div>
      </motion.div>

      {error && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
