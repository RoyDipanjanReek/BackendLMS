import { ApiError, catchAsync } from "../middleware/error.middleware";
import { Course } from "../models/course.model";
import { CoursePurchase } from "../models/coursePurchase.model";
import { Lecture } from "../models/lecture.model";
import { User } from "../models/user.model";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const initialStripeCheckout = catchAsync(async (req, res) => {
  const { courseId } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError("Course not found");
  }

  const newPurchase = new CoursePurchase({
    course: courseId,
    user: req.id,
    amount: course.price,
    status: "pending",
    paymentMethod: "stripe",
  });

  // create stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: course.title,
            images: [],
          },
          unit_amount: course.price * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.CLIENT_URL}/course-progress/${courseId}`,
    cancel_url: `${process.env.CLIENT_URL}/course-details/${courseId}`,

    metadata: {
      courseId: courseId,
      userId: req.id,
    },
    shipping_address_collection: {
      allowed_countries: ["IN"],
    },
  });

  if (!session.url) {
    throw new ApiError("Failed to create checkout session", 400);
  }

  newPurchase.paymentId = session.id;
  await newPurchase.save();

  res.status(200).json({
    success: true,
    data: {
      checkoutUrl: session.url,
    },
  });
});

export const handlStripeWebHooks = catchAsync(async (req, res) => {
  let event;

  try {
    const payloadString = JSON.stringify(req.body, null, 2);
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });

    event = stripe.webhooks.constructEvent(payloadString, header, secret);
  } catch (error) {
    throw new ApiError(`Webhook Error: ${error.message}`, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    //Find and update purches record
    const purches = await CoursePurchase.findOne({
      paymentId: session.id,
    }).populate("course");

    if (!purches) {
      throw new ApiError("Purches not found", 400);
    }

    //update purches details
    purches.amount = session.amount_total
      ? session.amount_total / 100
      : purches.amount;
    purches.status = "completed";
    await purches.save();

    // Make all lecture accessible
    if (purches.course?.Lectures?.length > 0) {
      await Lecture.updateMany(
        { _id: { $in: purches.course.Lecture } },
        { $set: { isPreview: true } }
      );
    }

    //Update user's enrolled course

    await User.findByIdAndUpdate(
      purches.user._id,
      { $addToSet: { enrolledCourse: purches.course.id } },
      { new: true }
    );

    //Update course's enrolled student
    await Course.findByIdAndUpdate(
      purches.course.id,
      { $addToSet: { enrolledCourse: purches.user } },
      { new: true }
    );
  }

  res.status(200).json({ received: true });
});


export const getCoursePurchaseStatus = catchAsync(async (req, res) => {
    const {courseId} = req.params

    //find course
    const course = await Course.findById(courseId)
        .populate("creaator", "name avater")
        .populate("lecture", "lectureTitle videoUrl duration")

    if(!course){
        throw new ApiError("Course not found", 404)
    }    

    const purchased = await CoursePurchase.exists({
        user: req.id,
        course: courseId,
        status: "completed"
    })

    res.status(200).json({
        success: true,
        data: {
            course,
            ispurchased : Boolean(purchased)
        }
    })
})