import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a file to Cloudinary
 * @param filePath Local path to the file
 * @param folder Optional folder name in Cloudinary
 * @returns Promise with upload result
 */
export const uploadToCloudinary = async (filePath: string, folder = 'uploads'): Promise<any> => {
  try {
    // Upload the image
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto',
    });
    
    // Remove the file after upload
    fs.unlinkSync(filePath);
    
    return result;
  } catch (error) {
    // Remove the file if upload failed
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

export default cloudinary;
