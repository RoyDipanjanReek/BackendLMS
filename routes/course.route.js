import express from "express";
import { isAuthenticated, restrictTo } from "../middleware/auth.middleware";
import upload from "../utils/multer";
import {
  addLectureToCourse,
  createNewCourse,
  getCourseLecture,
  getCoursesDetails,
  getMyCreatedCourses,
  getPublicCourses,
  searchCourse,
  updateCoursesDetails,
} from "../controller/course.controller";

const router = express.Router();

//Public router
router.get("/published", getPublicCourses);
router.get("/search", searchCourse);

//Protected route
router.use(isAuthenticated);

//Course management
router
  .route("/")
  .post(restrictTo("instructor"), upload.single("thumbnail"), createNewCourse)
  .get(restrictTo("instructor"), getMyCreatedCourses);

//Course details and updates
router
  .route("/c/:courseId")
  .get(getCoursesDetails)
  .patch(
    restrictTo("instructor"),
    upload.single("thumbnail"),
    updateCoursesDetails
  );

// Lecture management
router
  .route("/c/:courseId/lecture")
  .get(getCourseLecture)
  .post(restrictTo("instructor"), upload.single("video"), addLectureToCourse);

export default router;
