import * as express from "express";
/**
 * Health Check APIs
 * @author Qusai Safa
 */
export class HealthCheckController {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes() {
    this.router.get(["/analytics/health", "/health"], (req, res) => {
      const data = {
        uptime: process.uptime(),
        message: "Ok",
        date: new Date(),
      };
      res.status(200).send(data);
    });
  }
}
