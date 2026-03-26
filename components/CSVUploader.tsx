'use client';

/**
 * CSVUploader Component
 *
 * Allows users to upload a CSV or Excel file containing interview questions
 * to create a custom career path.
 *
 * Features:
 * - File input accepts .csv and .xlsx only
 * - Career name input with validation (3-50 characters)
 * - Upload progress indicator
 * - Success confirmation with topics/questions counts
 * - Error handling with retry option
 * - Detailed error messages for parsing issues
 */

import { useState, useRef } from 'react';

interface CSVUploadResult {
  careerId: string;
  careerName: string;
  topicsCreated: number;
  questionsAdded: number;
  topics: Array<{
    name: string;
    questionsAdded: number;
  }>;
}

interface UploadError {
  code: string;
  message: string;
}

interface CSVUploaderProps {
  onSuccess?: (result: CSVUploadResult) => void;
  onCancel?: () => void;
  className?: string;
}

const CAREER_NAME_MIN_LENGTH = 3;
const CAREER_NAME_MAX_LENGTH = 50;

// Error code to helpful message mapping
const ERROR_MESSAGES: Record<string, { title: string; message: string; suggestion?: string }> = {
  EMPTY_FILE: {
    title: 'Empty File',
    message: 'The uploaded file is empty.',
    suggestion: 'Please check that your file contains data.',
  },
  INVALID_COLUMNS: {
    title: 'Invalid Format',
    message: 'CSV/Excel must have columns: "Topic Name" and "Question Text".',
    suggestion: 'Ensure the first row contains these exact column headers.',
  },
  NO_DATA_ROWS: {
    title: 'No Data Found',
    message: 'The file must have a header row and at least one data row.',
    suggestion: 'Add at least one question below the header row.',
  },
  NO_QUESTIONS: {
    title: 'No Questions Found',
    message: 'No valid questions could be extracted from the file.',
    suggestion: 'Check that each row has both a topic name and question text.',
  },
  INVALID_CSV: {
    title: 'Invalid CSV Format',
    message: 'The CSV file could not be parsed.',
    suggestion: 'Ensure the file is a valid CSV with comma-separated values.',
  },
  INVALID_EXCEL: {
    title: 'Invalid Excel Format',
    message: 'The Excel file could not be read.',
    suggestion: 'Ensure the file is a valid .xlsx file.',
  },
  FILE_TOO_LARGE: {
    title: 'File Too Large',
    message: 'File size exceeds 10MB limit.',
    suggestion: 'Please reduce the file size or split into multiple files.',
  },
};

export function CSVUploader({ onSuccess, onCancel, className = '' }: CSVUploaderProps) {
  const [careerName, setCareerName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<CSVUploadResult | null>(null);
  const [careerNameError, setCareerNameError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateCareerName = (name: string): string => {
    if (name.length === 0) {
      return '';
    }
    if (name.length < CAREER_NAME_MIN_LENGTH) {
      return `Career name must be at least ${CAREER_NAME_MIN_LENGTH} characters`;
    }
    if (name.length > CAREER_NAME_MAX_LENGTH) {
      return `Career name must not exceed ${CAREER_NAME_MAX_LENGTH} characters`;
    }
    return '';
  };

  const handleCareerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCareerName(value);
    setCareerNameError(validateCareerName(value));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    const fileName = selectedFile.name.toLowerCase();
    const isValidType = fileName.endsWith('.csv') || fileName.endsWith('.xlsx');

    if (!isValidType) {
      setError('Please select a CSV or Excel (.xlsx) file');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check file size (limit to 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size must be less than 10MB');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleUpload = async () => {
    // Validate career name
    const nameError = validateCareerName(careerName);
    if (nameError) {
      setCareerNameError(nameError);
      return;
    }

    if (!file) {
      setError('Please select a CSV or Excel file');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('careerName', careerName);

      // Simulate progress for better UX (since fetch doesn't support progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/careers/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: { code: 'UNKNOWN', message: 'Upload failed' } }));
        throw new Error(data.error?.message || 'Upload failed');
      }

      const result: CSVUploadResult = await response.json();
      setSuccess(result);

      // Notify parent component after a short delay
      setTimeout(() => {
        onSuccess?.(result);
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setCareerName('');
    setFile(null);
    setSuccess(null);
    setError('');
    setProgress(0);
    setCareerNameError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getErrorDetails = () => {
    // Try to match error message to known error codes
    const errorCode = Object.keys(ERROR_MESSAGES).find(code =>
      error.toLowerCase().includes(code.toLowerCase().replace('_', ' ')) ||
      error.toLowerCase().includes(code.toLowerCase())
    );

    if (errorCode) {
      return ERROR_MESSAGES[errorCode];
    }

    return {
      title: 'Upload Error',
      message: error,
    };
  };

  const errorDetails = error ? getErrorDetails() : null;

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Upload Questions</h3>
              <p className="text-sm text-gray-500">Create a custom career path from CSV or Excel</p>
            </div>
          </div>
          {onCancel && !success && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {success ? (
          // Success State
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Career Path Created!
            </h4>
            <p className="text-gray-600 mb-6">
              <span className="font-medium">{success.careerName}</span> is ready for studying
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-indigo-600">{success.topicsCreated}</p>
                <p className="text-sm text-indigo-700">Topics Created</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-600">{success.questionsAdded}</p>
                <p className="text-sm text-green-700">Questions Added</p>
              </div>
            </div>

            {/* Topic breakdown */}
            {success.topics && success.topics.length > 0 && (
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Topics Created:</h5>
                <ul className="space-y-2">
                  {success.topics.map((topic, index) => (
                    <li key={index} className="flex justify-between text-sm">
                      <span className="text-gray-700">{topic.name}</span>
                      <span className="text-gray-500">{topic.questionsAdded} questions</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleReset}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Upload Another File
            </button>
          </div>
        ) : (
          // Upload Form
          <div className="space-y-6">
            {/* Career Name Input */}
            <div>
              <label htmlFor="career-name" className="block text-sm font-medium text-gray-700 mb-2">
                Career Path Name <span className="text-red-500">*</span>
              </label>
              <input
                id="career-name"
                type="text"
                value={careerName}
                onChange={handleCareerNameChange}
                placeholder="e.g., My Java Backend Interview Prep"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  careerNameError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={uploading}
              />
              {careerNameError && (
                <p className="mt-2 text-sm text-red-600">{careerNameError}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {CAREER_NAME_MIN_LENGTH}-{CAREER_NAME_MAX_LENGTH} characters
              </p>
            </div>

            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV or Excel File <span className="text-red-500">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  file
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />

                {file ? (
                  // File selected state
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  // No file selected state
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-gray-700 font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">CSV or Excel (.xlsx) files only, max 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && errorDetails && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">{errorDetails.title}</p>
                    <p className="text-sm text-red-700 mt-1">{errorDetails.message}</p>
                    {errorDetails.suggestion && (
                      <p className="text-sm text-red-600 mt-1">{errorDetails.suggestion}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Uploading...</span>
                  <span className="text-sm text-gray-500">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Processing your file and extracting questions...
                </p>
              </div>
            )}

            {/* Info Box - File Format */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">File Format</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Your CSV or Excel file should have two columns:
                  </p>
                  <div className="mt-2 bg-white rounded p-2 text-xs font-mono">
                    Topic Name, Question Text<br />
                    Java Concurrency, Explain synchronized vs ReentrantLock<br />
                    REST API, What are RESTful API principles?
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!careerName || !file || uploading || !!careerNameError}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload & Create Career
                  </>
                )}
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  disabled={uploading}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
