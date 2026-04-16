export const checkUploadFile = (file: Express.Multer.File | undefined) => {
  if (!file) {
    const error: any = new Error("No file uploaded or invalid file type.");
    error.status = 400;
    error.code = "Error_InvalidFile";
    throw error;
  }
};
