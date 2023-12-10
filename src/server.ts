import App from "./app";
import { HealthCheckController } from "./controllers";

const app = new App([new HealthCheckController()]);

app.listen();
