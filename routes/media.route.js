import express from "express";
import upload from "../utils/multer";
import uploadMedia from "../utils/cloudinary";

const router = express.Router();

router.route("/uplode-video").post(upload.post("file"), async (req, res) => {
  try {
    const result = await uploadMedia(req.file.path);
    res.status(201).json({
      success: true,
      message: "File uplode successfully",
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error in uploding file " });
  }
});

export default router
