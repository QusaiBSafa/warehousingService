import convict from "convict";
import config from "config";

// Define config schema
const ConfigValidator = convict({
  port: 3002,
  env: "development",
  sourceCountryShortCode: "AE",
  currency: "AED",
  aws: {
    region: "us-east-1",
    accessKeyId: "",
    secretAccessKey: "",
    apiVersion: "2019-12-20",
  },
  redshift: {
    bucketRegion: "",
    db: "",
    dbUser: "",
    clusterIdentifier: "",
  },
  kafka: {
    brokers: "",
  },
  slack: {
    enable: true,
    errorChannel: "C0325PG63NJ",
    warehouseChannel: "",
    doctorsReportChannel: "",
    revenueChannel: "",
    reminderReportChannelPerTenant: [
      { id: 1, reminderReport: "" },
      { id: 2, reminderReport: "" },
    ],
    token: "",
  },
  jwtSecret: "",
  accessToken: "",
  almaOsUrl: "https://almaos-dev.almahealth.io",
  logInfoLogs: false,
});
//Load environment dependent configuration
ConfigValidator.load(config);
// Perform schema validation
ConfigValidator.validate({ allowed: "strict" });

export default ConfigValidator;
