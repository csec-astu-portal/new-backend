import cloudinary from '../config/cloudinary';
import fs from 'fs';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

/**
 * Upload a file to Cloudinary
 * @param filePath Local path to the file
 * @param folder Cloudinary folder to upload to
 * @returns Cloudinary upload result
 */
export const uploadToCloudinary = async (filePath: string, folder: string = 'profile-photos') => {
  try {
    // Upload the file to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto' }
      ]
    });

    // Delete the local file after successful upload
    await unlinkAsync(filePath);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    // Try to delete the local file even if upload failed
    try {
      await unlinkAsync(filePath);
    } catch (unlinkError) {
      console.error('Error deleting local file:', unlinkError);
    }

    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: 'Failed to upload image'
    };
  }
};

/**
 * Delete a file from Cloudinary
 * @param publicId Cloudinary public ID of the file
 * @returns Cloudinary deletion result
 */
export const deleteFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    return {
      success: false,
      error: 'Failed to delete image'
    };
  }
};
