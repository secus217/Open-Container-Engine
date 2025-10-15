// utils/errorHandlers.ts

export interface ContainerError {
  isContainerError: boolean;
  message: string;
  shouldRetry: boolean;
  retryDelay?: number;
}

/**
 * Analyzes API errors to determine if they're related to container startup issues
 * and provides appropriate user-friendly messages and retry logic
 */
export function analyzeContainerError(error: any): ContainerError {
  const errorMessage = error?.response?.data?.message || error?.message || '';
  const statusCode = error?.response?.status;

  // Check for container-related errors
  const containerKeywords = [
    'ContainerCreating',
    'waiting to start',
    'BadRequest',
    'container',
    'pod'
  ];

  const isContainerError = statusCode === 400 && 
    containerKeywords.some(keyword => errorMessage.includes(keyword));

  if (isContainerError) {
    let userMessage = 'Container is starting up...';
    let shouldRetry = true;
    let retryDelay = 4000; // 4 seconds default

    // More specific messages based on error content
    if (errorMessage.includes('ContainerCreating')) {
      userMessage = 'Creating container - this usually takes 30-60 seconds';
      retryDelay = 5000;
    } else if (errorMessage.includes('waiting to start')) {
      userMessage = 'Waiting for container to start - checking dependencies';
      retryDelay = 4000;
    } else if (errorMessage.includes('BadRequest') && errorMessage.includes('container')) {
      userMessage = 'Container initializing - pulling image and starting services';
      retryDelay = 6000;
    }

    return {
      isContainerError: true,
      message: userMessage,
      shouldRetry,
      retryDelay
    };
  }

  // Not a container error
  return {
    isContainerError: false,
    message: errorMessage || 'An unexpected error occurred',
    shouldRetry: false
  };
}

/**
 * Creates a user-friendly error message for container-related issues
 */
export function getContainerErrorMessage(error: any, retryCount: number = 0, maxRetries: number = 15): string {
  const analysis = analyzeContainerError(error);
  
  if (analysis.isContainerError) {
    if (retryCount < maxRetries) {
      return `${analysis.message} (Attempt ${retryCount + 1}/${maxRetries}) - This is normal for new deployments`;
    } else {
      return 'Container is taking longer than expected to start. This might indicate an issue with the image, resource limits, or configuration. Try refreshing or check the deployment status.';
    }
  }

  return analysis.message;
}

/**
 * Determines if an error should trigger automatic retry logic
 */
export function shouldRetryContainerError(error: any, retryCount: number = 0, maxRetries: number = 15): boolean {
  const analysis = analyzeContainerError(error);
  return analysis.isContainerError && retryCount < maxRetries;
}
