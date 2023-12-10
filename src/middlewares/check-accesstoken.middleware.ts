import { HttpException } from "../exceptions";
import { Request, Response, NextFunction } from "express";
import ConfigValidator from "../defaultConfig";

export const checkAccessToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const accessToken = <string>req.headers["accesstoken"];
  // Validate secret key
  if (ConfigValidator.get("accessToken") !== accessToken) {
    throw new HttpException(401, "invalid access token");
  }
  next();
};
