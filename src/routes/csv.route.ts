import { Router } from "express";
import multer from "multer";
import path from "path";
import { uploadCsv, getCsvData, uploadEditionMaster } from "../controller/csv.controller.js";

const csvRouter = Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = [
      "text/csv",
      "text/x-csv",
      "application/vnd.ms-excel",
      "application/csv",
      "application/x-csv",
      "text/comma-separated-values",
      "text/x-comma-separated-values",
      "application/octet-stream"
    ];
    if (ext === ".csv" || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed!"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Route to handle CSV upload with inline error handling for multer
csvRouter.post(
  "/upload",
  upload.single("file"),
  uploadCsv
);

csvRouter.post(
  "/edition-master",
  upload.single("file"),
  uploadEditionMaster
);

export default csvRouter;