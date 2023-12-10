import { HttpException } from "./../exceptions";
import { Request, Response, NextFunction } from "express";

export const checkRole = (roles: Array<string>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const role = res.locals.jwtPayload.role;
    if (!roles.includes) {
      throw new HttpException(403, "access denied");
    }
    next();
  };
};
