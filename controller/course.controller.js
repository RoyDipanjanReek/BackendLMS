import { User } from "../models/user.model";
import { Course } from "../models/course.model";
import { ApiError, catchAsync } from "../middleware/error.middleware";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary";
import { Promise } from "mongoose";
import { Lecture } from "../models/lecture.model";

export const createNewCourse = catchAsync(async (req, res) => {
  const { title, subTitle, description, catagory, price } = req.body;

  let thumbnail;
  if (req.file) {
    const result = await uploadMedia.apply(req.file.path);
    thumbnail = result?.secure_url || req.file.path;
  } else {
    throw new ApiError("Course thumbnail is required", 400);
  }

  // create course
  const course = await Course.create({
    title,
    subTitle,
    description,
    catagory,
    thumbnail,
    price,
    instructor: req.id,
  });

  await User.findByIdAndUpdate(req.id, {
    $push: { createdCourse: course.id },
  });

  res.staus(201).json({
    success: true,
    message: "Course created successfully",
    data: course,
  });
});

export const searchCourse = catchAsync(async (req, res) => {
  const {
    query = "",
    catagorys = [],
    level,
    priceRange,
    sortBy = "newest",
  } = req.body;

  const searechCriteria = {
    isPublished: true,
    $or: [
      { title: { $regex: query, $option: "i" } },
      { subTitle: { $regex: query, $option: "i" } },
      { description: { $regex: query, $option: "i" } },
    ],
  };

  // Apply filter
  if (catagorys.length > 0) {
    searechCriteria.catagory = { $in: catagorys };
  }
  if (level) {
    searechCriteria.level = level;
  }
  if (priceRange) {
    const [min, max] = priceRange.split("-");
    searechCriteria.price = { $gte: min || 0, $lte: max || Infinity };
  }

  const sortOption = {};

  switch (sortBy) {
    case "Price-low":
      sortOption.price = 1;
      break;
    case "Price-high":
      sortOption.price = -1;
      break;
    case "oldest":
      sortOption.price = 1;
      break;
    default:
      sortOption.price = -1;
  }

  const courses = await Course.find(searechCriteria)
    .populate({
      path: "instructor",
      select: "name avater",
    })
    .sort(sortOption);

  res.status(201).json({
    success: true,
    message: "course created successfully",
    data: courses,
  });
});

export const getPublicCourses = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [courses, total] = await Promise.all([
    Course.find({ isPublished: true })
      .populate({
        path: "instructor",
        select: "name avater",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Course.countDocuments({ isPublished: true }),
  ]);

  res.status(201).json({
    success: true,
    data: courses,
    pagination: {
      page,
      limit,
      total,
      page: Math.ceil(total / limit),
    },
  });
});

export const getMyCreatedCourses = catchAsync(async (req, res) => {
  const courses = await Course.find({ instructor: req.id }).populate({
    path: "enrolledStudent",
    select: "name avater",
  });

  res.status(201).json({
    ststus: true,
    count: courses.length,
    data: courses,
  });
});

export const updateCoursesDetails = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { title, description, subTitle, catagory, level, price } = req.body;

  const course = Course.findById(courseId);

  if (!course) {
    throw new ApiError("Course not found", 401);
  }

  if (course.instructor.toString() !== req.id) {
    throw new ApiError("Not authorized to update course", 403);
  }

  let thumbnail;
  if (req.file) {
    if (course.thumbnail) {
      await deleteMediaFromCloudinary(course.thumbnail);
    }
    const result = await uploadMedia(req.file.path);
    thumbnail = result?.secure_url || req.file.path;
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    courseId,
    {
      title,
      subTitle,
      description,
      catagory,
      level,
      price,
      ...(thumbnail && thumbnail),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(201).json({
    success: true,
    message: "Course update successfully",
    data: updatedCourse,
  });
});
export const getCoursesDetails = catchAsync(async (req, res) => {
  const course = await Course.findById(req.params.courseId)
    .populate({
      path: "instructor",
      select: "name avater bio",
    })
    .populate({
      path: "lecture",
      select: "title videoUrl duration isPreview order",
    });

  if (!course) {
    throw new ApiError("Course not found", 401);
  }

  res.status(201).json({
    success: true,
    data: {
      ...course.toJSON(),
      avarageRating: course.avarageRating,
    },
  });
});

export const addLectureToCourse = catchAsync(async (req, res) => {
  const { title, description, isPreview } = req.body;
  const { courseId } = req.params;

  const course = await Course.findById(courseId);

  if (!course) {
    throw new ApiError("Course not found", 401);
  }
  if (course.instructor.toString() !== req.id) {
    throw new ApiError("Npt authorized to add lecture", 403);
  }

  if (!req.file) {
    throw new ApiError("File is required", 402);
  }

  const result = await uploadMedia(req.file.path);
  if (!result) {
    throw new ApiError("Error uploading video", 403);
  }

  const lecture = await Lecture.create({
    title,
    description,
    isPreview,
    order: course.lecture.length + 1,
    videoUrl: result?.secure_url || req.file.path,
    publicId: result?.public_id || req.file.path,
    duration: result?.duration || 0,
  });

  course.lecture.push(lecture._id);
  await course.save();

  res.status(201).json({
    success: true,
    message: "Lecture added successfully",
    data: lecture,
  });
});
export const getCourseLecture = catchAsync(async (req, res) => {
  const course = await Course.findById(req.params.courseId).populate({
    path: "lecture",
    select: "title description videoUrl duration isPreview order",
    options: { sort: { order: 1 } },
  });

  if (!course) {
    throw new ApiError("Course not found", 403);
  }
  const isEnrolled = course.enrolledStudent.includes(req.id);
  const isInstructor = course.instructor.toString() === req.id;

  let lecture = course.lecture;
  if (!isEnrolled && isInstructor) {
    lecture = lecture.filter((lecture) => lecture.isPreview);
  }

  res.status(200).json({
    success: true,
    data: {
      lecture,
      isEnrolled,
      isInstructor,
    },
  });
});
