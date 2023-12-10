import "reflect-metadata";
import config from "config";
import morgan from "morgan";
import helmet from "helmet";
import express from "express";

import { logger, stream } from "./utils";
import ConfigValidator from "./defaultConfig";
import { errorMiddleware } from "./middlewares";
import { KafkaConsumerService } from "./services";
/**
 * Main service APP
 * @author Qusai Safa
 */
class App {
  public app: express.Application;
  public port: string | number;
  public env: string;
  private kafkaConsumerService: KafkaConsumerService;

  constructor(controllers) {
    this.app = express();
    this.port = config.get("port") || 3002;
    this.env = config.get("env") || "development";

    this.initializeMiddleware();
    this.initializeErrorHandler();
    this.initializeControllers(controllers);

    this.kafkaConsumerService = new KafkaConsumerService();
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`Warehouse service listening on the port ${this.port}`);
      logger.info(`=================================`);
      this.kafkaConsumerService.consume();
    });
  }

  private initializeMiddleware() {
    this.app.use(helmet());
    this.app.use(morgan("combined", ConfigValidator));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Handling CORS
    this.app.use((req, res, next) => {
      res.append("Access-Control-Allow-Origin", "*");
      res.append("Access-Control-Allow-Methods", "*");
      res.append("Access-Control-Allow-Headers", "*");
      next();
    });
  }

  private initializeControllers(controllers) {
    controllers.forEach((controller) => {
      this.app.use(controller.router);
    });
  }

  private initializeErrorHandler() {
    this.app.use(errorMiddleware);
  }
}

export default App;
