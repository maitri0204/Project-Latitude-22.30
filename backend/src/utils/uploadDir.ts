import path from "path";
import fs from "fs";

export const getUploadBaseDir = (): string => {
  return path.join(process.cwd(), "uploads");
};

export const ensureDir = (dirPath: string): void => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.warn(`Warning: Could not create directory ${dirPath}:`, err);
  }
};
