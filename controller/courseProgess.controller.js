import { CourseProgress } from "../models/courseProgress";
import { Course } from "../models/course.model";
import { catchAsync } from "../middleware/error.middleware";
import { ApiError } from "../middleware/error.middleware";

export const getUserCourseProgress = catchAsync(async (req, res) => {
  const { coursrId } = req.params;

  const courseDetaild = await Course.findById(coursrId)
    .populate("lecture")
    .select("courseTitle courseThumbnail lecture");

  if (!courseDetaild) {
    throw new ApiError("Course not found", 404);
  }

  const courseProgress = await CourseProgress.findOne({
    course: coursrId,
    user: req.id,
  }).populate("course");

  if (!courseProgress) {
    return res.status(200).json({
      success: true,
      data: {
        courseDetaild,
        progress: [],
        isCompleted: false,
        completionPercentage: 0,
      },
    });
  }
});

export const markCourseAsCompleted = catchAsync(async (req, res) => {
  const {coursrId} = req.params

  //find course
  const courseProgress = await CourseProgress.findOne({
    course: coursrId,
    user: req.id
  });
  
  if (!courseProgress) {
    throw new ApiError("Course is not found")
  }

  courseProgress.lectureProgress.forEach((progress)=> {
    progress.isCompleted = true
  })

  courseProgress.isCompleted = true

  await courseProgress.save()

  res.status(200).json({
    success: true,
    message: "Course mark as completed",
    data: courseProgress
  })

});

