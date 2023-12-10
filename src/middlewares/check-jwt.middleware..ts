import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import config from "config";
import { HttpException } from "./../exceptions";

export const checkJwt = (req: Request, res: Response, next: NextFunction) => {
  //Get the jwt token from the head
  const authorizationHeader = <string>req.headers["authorization"];
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    throw new HttpException(401, "unauthorized");
  }
  const token = authorizationHeader.substring(7, authorizationHeader.length);
  let jwtPayload;

  //Try to validate the token and get data
  try {
    jwtPayload = <any>jwt.verify(token, config.get<string>("jwtSecret"));
    res.locals.jwtPayload = jwtPayload;
  } catch (error) {
    //If token is not valid, respond with 401 (unauthorized)
    throw new HttpException(401, "unauthorized");
  }

  //The token is valid for 15 minutes
  //We want to send a new token on every request
  const { userId, username } = jwtPayload;
  const newToken = jwt.sign(
    { userId, username },
    config.get<string>("jwtSecret"),
    {
      expiresIn: "15m",
    }
  );
  res.setHeader("token", newToken);

  //Call the next middleware or controller
  next();
};
