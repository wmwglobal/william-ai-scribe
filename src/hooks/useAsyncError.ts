import { useCallback } from 'react';

/**
 * Hook to throw async errors so they can be caught by Error Boundaries
 * 
 * React Error Boundaries don't catch errors that happen in:
 * - Event handlers
 * - Asynchronous code (e.g. setTimeout or requestAnimationFrame callbacks)
 * - During server side rendering
 * - Errors thrown in the error boundary itself
 * 
 * This hook provides a way to re-throw async errors in the render cycle
 * so they can be caught by Error Boundaries.
 * 
 * @example
 * function MyComponent() {
 *   const throwError = useAsyncError();
 *   
 *   useEffect(() => {
 *     fetchData().catch(throwError);
 *   }, [throwError]);
 *   
 *   const handleClick = async () => {
 *     try {
 *       await someAsyncOperation();
 *     } catch (error) {
 *       throwError(error);
 *     }
 *   };
 * }
 */
export function useAsyncError() {
  return useCallback((error: Error) => {
    // Use setTimeout to move the error to the next tick
    // This ensures it's thrown during the render cycle where
    // Error Boundaries can catch it
    setTimeout(() => {
      throw error;
    }, 0);
  }, []);
}

/**
 * Hook to safely handle async operations with automatic error boundary integration
 * 
 * @example
 * function MyComponent() {
 *   const { execute, loading, error } = useAsyncOperation();
 *   
 *   const handleClick = () => {
 *     execute(async () => {
 *       const data = await fetchData();
 *       return data;
 *     });
 *   };
 * }
 */
export function useAsyncOperation() {
  const throwError = useAsyncError();
  
  return useCallback(async (operation: () => Promise<any>) => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error) {
        throwError(error);
      } else {
        throwError(new Error(String(error)));
      }
    }
  }, [throwError]);
}