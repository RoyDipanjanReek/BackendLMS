import { ApiError, catchAsync } from "./error.middleware";
import jwt from 'jsonwebtoken'

export const isAuthenticated = catchAsync(async(req, resizeBy, next) => {
   const token = req.cookies.token

   if(!token){
        throw new ApiError("You are not logged in", 401)
   }

   try {
    const decoded = await jwt.verify(token, process.env.SECRET_TOKEN)
    req.id = decoded.userId
    next()
   } catch (error) {
    throw new ApiError("JWT token error",401)
   }
})