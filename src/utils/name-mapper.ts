/**
 * Utility functions for mapping between freeName and fullName
 * This provides a consistent way to handle the transition from freeName to fullName
 * throughout the codebase while maintaining backward compatibility
 */

/**
 * Maps an object with freeName to include fullName
 * @param obj Any object that contains a freeName property
 * @returns The same object with an added fullName property
 */
export function mapFreeNameToFullName<T extends { freeName: string }>(obj: T): T & { fullName: string } {
  return {
    ...obj,
    fullName: obj.freeName
  };
}

/**
 * Maps an array of objects with freeName to include fullName
 * @param array Array of objects that contain a freeName property
 * @returns The same array with fullName added to each object
 */
export function mapArrayFreeNameToFullName<T extends { freeName: string }>(array: T[]): (T & { fullName: string })[] {
  return array.map(item => mapFreeNameToFullName(item));
}

/**
 * Updates an object to use freeName from fullName if provided
 * @param data Object that may contain fullName and/or freeName
 * @returns The same object with freeName set from fullName if needed
 */
export function ensureFreeNameFromFullName<T extends Record<string, any>>(data: T): T {
  if (data.fullName && !data.freeName) {
    return {
      ...data,
      freeName: data.fullName
    };
  }
  return data;
}
