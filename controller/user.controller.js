import { ApiError, catchAsync } from "../middleware/error.middleware";
import { User } from "../models/user.model";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary";
import { generateToken } from "../utils/generateToken";

export const createUserAccount = catchAsync(async (req, res) => {
  const { name, email, password, role = "student" } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new ApiError("User already exists", 400);
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
  });

  await user.updateLastActive();
  generateToken(res, user, "Account created successfully");
});

export const authenticatUser = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user || user.comparePassword(password)) {
    throw new ApiError("Invalid email or password", 401);
  }

  await user.updateLastActive();
  generateToken(res, user, `welcome back ${user.name}`);
});

export const signOutUser = catchAsync(async (_, res) => {
  res.cookie("token", "", { maxAge: 0 });
  res.status(200).json({
    success: true,
    message: "Signout Successfully",
  });
});

export const getCurrentUserProfile = catchAsync(async (req, res) => {
  const user = User.findById(req.id).populate({
    path: "enrolledCourse.course",
    select: "title thumbnail description",
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      ...user.toJSON(),
      totalEnrolledCourses: user.totalEnrolledCourses,
    },
  });
});

export const updateUserProfile = catchAsync(async (req, res) => {
  const { name, email, bio } = req.body;

  const updateDate = {
    name,
    email: email?.toLowerCase(),
    bio,
  };

  if (req.file) {
    const avaterResult = await uploadMedia(req.file.path);
    updateDate.avater = avaterResult.secure_url;

    // delete

    const user = await User.findById(req.id);

    if (user.avater && user.avater !== "default-avater.png") {
      await deleteMediaFromCloudinary(user.avater);
    }
  }

  //update user and get updated doc

  const updatedUser = await User.findByIdAndUpdate(req.id, updateDate, {
    new: true,
    runValidators: true,
  });

  if (!updateDate) {
    throw new ApiError("User not found");
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

export const changeUserPassword = catchAsync(async (req, res) => {
  const { oldPassword, newPassword, confirmNewPassword } = req.body;

  //check newPassword and confirmPassword same or not
  if (newPassword !== confirmNewPassword) {
    throw new ApiError("newPssword and confirm password should be same");
  }

  //get uer with password
  const user = await User.findById(req.id).select("+password");

  //found the user exiestence
  if (!user) {
    throw new ApiError("user not found");
  }

  //veryfy oldPassword
  if (!(await user.comparePassword(oldPassword))) {
    throw new ApiError("Old password in incorrect.");
  }

  //save new Password to old password
  user.password = newPassword;
  await user.save();

  res.status(201).json({
    success: true,
    message: "Password change successfully",
  });
});

export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError("User not found");
  }

  const resetToken = user.resetPasswordToken();
  await user.save({ validateBeforeSave: false });
});

export const deleteAccount = catchAsync(async (req, res) => {
  const { user } = req.id;

  // delete avater if not default
  if (user.avater && user.avater !== "default-avatar.png") {
    await deleteMediaFromCloudinary(user.avater);
  }

  //de;ete user
  await User.findByIdAndDelete(req.id);

  res.cookie("token", "", { maxAge: 0 });

  res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
});
