import config from "config";
import * as moment from "moment-timezone";
import {
  RedshiftDataClient,
  ExecuteStatementCommand,
  DescribeStatementCommand,
  GetStatementResultCommand,
} from "@aws-sdk/client-redshift-data";

import { SlackService } from "./slack.service";
import qb from "../core/queryBuilder";
import { HttpException } from "./../exceptions";
import {
  logger,
  aggregateByReminderDate,
  createDoctorsReportTable,
  redshiftResponseToListOfObjects,
} from "../utils";
import {
  GET_ALL,
  Duration,
  GET_BY_EVENT_TYPE,
  GET_ACTIVE_DOCTORS,
  GET_VERIFIED_USERS_COUNT,
  GET_WEEK_COUNT_BY_STATUS,
  GET_ORDERS_REMINDER_DATE,
  GET_LAB_TESTS_WITH_DOCTORS,
  GET_ORDERS_REVENUE_LAST_DAY,
  GET_ORDERS_OF_CONSULTATIONS,
  GET_ORDERS_REVENUE_LAST_WEEK,
  GET_LAST_DAY_COUNT_BY_STATUS,
  GET_ORDERS_REVENUE_LAST_MONTH,
  GET_CONSULTATIONS_WITH_DOCTORS,
  GET_LAST_DAY_COUNT_BY_EVENT_TYPE,
  GET_CONSULTATIONS_WITHOUT_DOCTORS,
  GET_ACTIVE_USERS_COUNT_BY_PLATFORM,
  GET_CURRENT_MONTH_VERIFIED_USERS_COUNT,
  GET_CURRENT_MONTH_ORDERS_COUNT_BY_STATUS,
  GET_LAST_DAY_CONSULTATIONS_COUNT_BY_STATUS,
  GET_CONSULTATIONS_OUT_RENEWAL_REMINDER_DATE,
  GET_CURRENT_MONTH_CONSULTATIONS_COUNT_BY_STATUS,
  GET_NOT_LOGGED_IN_ACTIVE_USERS_COUNT_BY_PLATFORM,
  GET_CURRENT_MONTH_CONSULTATIONS_NEW_PATIENTS_COUNT_BY_STATUS,
} from "./../common";

/**
 * This service to handle communication with redshift DB
 * @author Qusai Safa
 */
class RedshiftService {
  private redshiftData: RedshiftDataClient;
  private slackService: SlackService;
  private validQueryStatuses = ["PICKED", "FINISHED", "SUBMITTED", "STARTED"];
  private almaOsUrl: string;

  constructor() {
    this.redshiftData = new RedshiftDataClient({
      region: config.get<string>("aws.region"),
      apiVersion: config.get<string>("aws.apiVersion"),
      credentials: {
        accessKeyId: config.get<string>("aws.accessKeyId"),
        secretAccessKey: config.get<string>("aws.secretAccessKey"),
      },
    });
    this.slackService = new SlackService();
    this.almaOsUrl = config.get<string>("almaOsUrl");
  }

  /**
   *
   * @param sql query
   * @param queryName
   * @param parameters query params
   * @returns return final result
   */
  public async queryAndFetch(
    sql: string,
    queryName?: string,
    parameters?: any[]
  ) {
    const queryResult = await this.query(sql, queryName, parameters);

    return await this.fetchResults(queryResult.Id);
  }

  /**
   * SQL query request to redShift
   * @returns Reference ID for the results
   */
  public async query(
    sql: string,
    queryName?: string,
    parameters?: any[]
  ): Promise<number | any> {
    const params = {
      Database: config.get<string>("redshift.db"),
      Sql: sql,
      ClusterIdentifier: config.get<string>("redshift.clusterIdentifier"),
      DbUser: config.get<string>("redshift.dbUser"),
      QueryParameters: parameters,
      StatementName: queryName,
      WithEvent: true || false,
    };
    const command = new ExecuteStatementCommand(params);

    try {
      const result = await this.redshiftData.send(command);
      this.describe(result.Id);

      return result;
    } catch (error) {
      await this.slackService.error(error);
      logger.error(error);
      throw new HttpException(500, error.message);
    }
  }

  public async describe(id: string): Promise<number | any> {
    const params = {
      Id: id,
    };
    try {
      const result = await this.redshiftData.send(
        new DescribeStatementCommand(params)
      );
      if (result.Status === "FAILED") {
        logger.error("-------------------------------------------\n");
        logger.error(
          `error details for query id ${id}: ${JSON.stringify(result)}`
        );
        await this.slackService.error(
          `error details for query id ${id}: ${JSON.stringify(result)}`
        );
      }
      return result;
    } catch (error) {
      await this.slackService.error(error);
      logger.error(error);
      throw new HttpException(500, error.message);
    }
  }

  /**
   * Fetch the results using the Id returned from the query request
   * @param id: the id returned from the query to redshift
   */
  public async fetchResults(id: string): Promise<any> {
    const params = {
      Id: id,
    };
    try {
      const result = await this.redshiftData.send(
        new GetStatementResultCommand(params)
      );
      return result;
    } catch (error) {
      const describeResult = await this.describe(id);
      if (this.validQueryStatuses.includes(describeResult.Status)) {
        return await this.fetchResults(id);
      } else {
        await this.slackService.error(error);
        logger.error(error);
        throw new HttpException(500, error.message);
      }
    }
  }

  /**
   * Get all records
   * @param tableName
   * @returns
   */
  public async getAll(tableName: string) {
    return this.queryAndFetch(GET_ALL(tableName), `get-all-${tableName}`);
  }

  public async getBy(
    tableName: string,
    byColumnName: string,
    byColumnValue: string,
    options: any = {}
  ) {
    const {
      filterByCountry = true,
      sortBy = "eventtime",
      sortDir = "ASC",
    } = options;
    let query = qb(`event.${tableName}`).where(byColumnName, byColumnValue);

    if (filterByCountry) {
      query = query.andWhere(
        "sourcecountryshortcode",
        config.get<string>("sourceCountryShortCode")
      );
    }

    query = query.orderBy(sortBy, sortDir);

    return this.queryAndFetch(
      query.toQuery(),
      `get-${tableName}-by-column-${byColumnName}-${byColumnValue}`
    );
  }

  /**
   * Get records by event type
   * @param tableName
   * @param eventType
   * @returns
   */
  public async getByEventType(tableName: string, eventType: string) {
    return this.queryAndFetch(
      GET_BY_EVENT_TYPE(tableName, eventType),
      `get-${tableName}-by-event-type-${eventType}`
    );
  }

  /**
   * Send to slack channel the count of created/updated records.
   */
  async countsReportByCountry(countryCode: string) {
    let queries = new Map<string, any>();

    queries.set(
      "createdOrders",
      await this.query(
        GET_LAST_DAY_COUNT_BY_EVENT_TYPE("order", "create", countryCode)
      )
    );
    queries.set(
      "deliveredOrders",
      await this.query(
        GET_LAST_DAY_COUNT_BY_STATUS("order", "Delivered", countryCode)
      )
    );
    queries.set(
      "createdConsultations",
      await this.query(
        GET_LAST_DAY_COUNT_BY_EVENT_TYPE("consultation", "create", countryCode)
      )
    );
    queries.set(
      "completedConsultations",
      await this.query(
        GET_LAST_DAY_CONSULTATIONS_COUNT_BY_STATUS("COMPLETED", countryCode)
      )
    );
    queries.set(
      "cancelledConsultations",
      await this.query(
        GET_LAST_DAY_COUNT_BY_STATUS("consultation", "CANCELED", countryCode)
      )
    );
    queries.set(
      "nowShowConsultations",
      await this.query(
        GET_LAST_DAY_COUNT_BY_STATUS("consultation", "NO_SHOW", countryCode)
      )
    );
    queries.set(
      "currentMonthCompletedConsultations",
      await this.query(
        GET_CURRENT_MONTH_CONSULTATIONS_COUNT_BY_STATUS(
          "COMPLETED",
          countryCode,
          "id"
        )
      )
    );
    queries.set(
      "currentMonthNoShowConsultations",
      await this.query(
        GET_CURRENT_MONTH_CONSULTATIONS_COUNT_BY_STATUS(
          "NO_SHOW",
          countryCode,
          "id"
        )
      )
    );
    queries.set(
      "currentMonthConsultationsPatient",
      await this.query(
        GET_CURRENT_MONTH_CONSULTATIONS_COUNT_BY_STATUS(
          "COMPLETED",
          countryCode,
          "userid"
        )
      )
    );

    queries.set(
      "currentMonthConsultationsNewPatient",
      await this.query(
        GET_CURRENT_MONTH_CONSULTATIONS_NEW_PATIENTS_COUNT_BY_STATUS(
          "COMPLETED",
          countryCode
        )
      )
    );
    queries.set(
      "currentMonthDeliveredOrders",
      await this.query(
        GET_CURRENT_MONTH_ORDERS_COUNT_BY_STATUS("Delivered", countryCode)
      )
    );
    queries.set(
      "currentMonthVerifiedUsers",
      await this.query(
        GET_CURRENT_MONTH_VERIFIED_USERS_COUNT("COMPLETED", countryCode)
      )
    );
    queries.set(
      "createdUsers",
      await this.query(
        GET_LAST_DAY_COUNT_BY_EVENT_TYPE("user", "create", countryCode)
      )
    );
    queries.set(
      "verifiedUsers",
      await this.query(GET_VERIFIED_USERS_COUNT(countryCode))
    );

    queries.set(
      "iosActiveUsers",
      await this.query(GET_ACTIVE_USERS_COUNT_BY_PLATFORM("ios", countryCode))
    );

    queries.set(
      "androidActiveUsers",
      await this.query(
        GET_ACTIVE_USERS_COUNT_BY_PLATFORM("android", countryCode)
      )
    );

    queries.set(
      "iosNotLoggedInActiveUsers",
      await this.query(
        GET_NOT_LOGGED_IN_ACTIVE_USERS_COUNT_BY_PLATFORM("ios", countryCode)
      )
    );

    queries.set(
      "androidNotLoggedInActiveUsers",
      await this.query(
        GET_NOT_LOGGED_IN_ACTIVE_USERS_COUNT_BY_PLATFORM("android", countryCode)
      )
    );

    queries.set(
      "huaweiActiveUsers",
      await this.query(
        GET_ACTIVE_USERS_COUNT_BY_PLATFORM("HarmonyOS", countryCode)
      )
    );

    queries.set(
      "huaweiNotLoggedInActiveUsers",
      await this.query(
        GET_NOT_LOGGED_IN_ACTIVE_USERS_COUNT_BY_PLATFORM(
          "HarmonyOS",
          countryCode
        )
      )
    );

    queries.set(
      "mobileWebActiveUsers",
      await this.query(
        GET_ACTIVE_USERS_COUNT_BY_PLATFORM("MobileWeb", countryCode)
      )
    );

    queries.set(
      "mobileWebNotLoggedInActiveUsers",
      await this.query(
        GET_NOT_LOGGED_IN_ACTIVE_USERS_COUNT_BY_PLATFORM(
          "MobileWeb",
          countryCode
        )
      )
    );

    // Wait few time before fetching queries results to make sure they are ready
    setTimeout(async () => {
      for (const [key, value] of queries) {
        const result = await this.fetchResults(value.Id);
        queries.set(key, result?.Records[0][0].longValue || 0);
      }
      await this.slackService.addCountsReport(
        Object.fromEntries(queries),
        countryCode
      );
    }, 250000);
  }

  async revenueReportPerCountry(countryCode: string, currency: string) {
    let queries = new Map<string, any>();
    queries.set(
      "dayNumberOfOrders",
      await this.query(
        GET_LAST_DAY_COUNT_BY_STATUS("order", "Delivered", countryCode)
      )
    );
    queries.set(
      "weekNumberOfOrders",
      await this.query(
        GET_WEEK_COUNT_BY_STATUS("order", "Delivered", countryCode)
      )
    );
    queries.set(
      "monthNumberOfOrders",
      await this.query(
        GET_CURRENT_MONTH_ORDERS_COUNT_BY_STATUS("Delivered", countryCode)
      )
    );
    queries.set(
      "ordersDayRevenue",
      await this.query(GET_ORDERS_REVENUE_LAST_DAY(countryCode))
    );
    queries.set(
      "ordersWeekRevenue",
      await this.query(GET_ORDERS_REVENUE_LAST_WEEK(countryCode))
    );
    queries.set(
      "ordersMonthRevenue",
      await this.query(GET_ORDERS_REVENUE_LAST_MONTH(countryCode))
    );
    // Wait few time before fetching queries results to make sure they are ready
    setTimeout(async () => {
      for (const [key, value] of queries) {
        const result = await this.fetchResults(value.Id);
        queries.set(
          key,
          result?.Records[0][0].stringValue ||
            result?.Records[0][0].longValue ||
            0
        );
      }
      await this.slackService.addRevenueReport(
        Object.fromEntries(queries),
        countryCode,
        currency
      );
    }, 190000);
  }

  async doctorsReport(countryCode: string, duration: Duration) {
    if (!duration) {
      duration = Duration.WEEK;
    }
    let queries = new Map<string, any>();
    queries.set(
      "activeDoctors",
      await this.query(GET_ACTIVE_DOCTORS(duration, countryCode))
    );
    queries.set(
      "ordersOfConsultations",
      await this.query(GET_ORDERS_OF_CONSULTATIONS(duration, countryCode))
    );
    queries.set(
      "consultationsWithDoctors",
      await this.query(GET_CONSULTATIONS_WITH_DOCTORS(duration, countryCode))
    );
    queries.set(
      "consultationsWithoutDoctors",
      await this.query(GET_CONSULTATIONS_WITHOUT_DOCTORS(duration, countryCode))
    );
    queries.set(
      "labTestsRequestedByDoctor",
      await this.query(GET_LAB_TESTS_WITH_DOCTORS(duration, countryCode))
    );

    setTimeout(async () => {
      // Fetch active doctors
      const activeDoctorsQueryResponse = await this.fetchResults(
        queries.get("activeDoctors").Id
      );
      // Fetch orders of consultations
      const ordersOfConsultationsQueryResponse = await this.fetchResults(
        queries.get("ordersOfConsultations").Id
      );

      // Fetch consultations of doctor
      const consultationsWithDoctorsQueryResponse = await this.fetchResults(
        queries.get("consultationsWithDoctors").Id
      );

      // Fetch consultations 'without' doctors
      const consultationsWithoutDoctorsQueryResponse = await this.fetchResults(
        queries.get("consultationsWithoutDoctors").Id
      );

      // Fetch consultations of doctor
      const labTestsRequestedByDoctorQueryResponse = await this.fetchResults(
        queries.get("labTestsRequestedByDoctor").Id
      );

      const reports = await createDoctorsReportTable(
        activeDoctorsQueryResponse,
        ordersOfConsultationsQueryResponse,
        consultationsWithDoctorsQueryResponse,
        consultationsWithoutDoctorsQueryResponse,
        labTestsRequestedByDoctorQueryResponse
      );
      Promise.all(
        reports.map(async (report) => {
          await this.slackService.addDoctorsReport(
            report.name,
            report.report,
            countryCode,
            duration
          );
        })
      );
    }, 50000);
  }

  /**
   *
   * Report of orders, consultations and their follow up orders revenues
   *  that their reminder date is between specified duration
   */
  async orderRenewalCompletionReport(
    countryCode: string,
    tenants: any[],
    duration = Duration.WEEK
  ) {
    // Send report for each tenant
    tenants.map(async (tenant) => {
      const query = await this.query(
        GET_CONSULTATIONS_OUT_RENEWAL_REMINDER_DATE(
          //Weekly report: date-7 -> date-14
          //Monthly report: date-7 -> date-30
          duration === Duration.WEEK ? Duration.TWO_WEEKS : Duration.MONTH,
          countryCode,
          tenant?.id
        )
      );
      // Wait few time before fetching queries results to make sure they are ready
      setTimeout(async () => {
        const results = await this.fetchResults(query.Id);
        const recordsList = await redshiftResponseToListOfObjects(results);
        const remindersReportList = await aggregateByReminderDate(
          recordsList,
          duration
        );
        if (remindersReportList?.length < 1) {
          return;
        }
        await this.slackService.addRenewalCompletionReport(
          duration,
          remindersReportList,
          countryCode,
          tenant?.reminderReport
        );
      }, 20000);
    });
  }

  /**
   *
   * List of orders and line items that their reminder date is today
   */
  async orderRenewalReminderReport(countryCode: string, tenants: any[]) {
    const today = moment.utc().startOf("day");
    // Send report for each tenant
    tenants.map(async (tenant) => {
      const query = await this.query(
        GET_ORDERS_REMINDER_DATE(
          today.format("YYYY-MM-DD:HH:mm:ss"),
          countryCode,
          tenant?.id
        )
      );
      // Wait few time before fetching queries results to make sure they are ready
      setTimeout(async () => {
        const results = await this.fetchResults(query.Id);
        const orders = await redshiftResponseToListOfObjects(results);
        if (orders?.length < 1) {
          return;
        }
        await this.slackService.addOrdersRenewalReminderReport(
          this.almaOsUrl,
          today.format("YYYY-MM-DD"),
          orders,
          tenant?.reminderReport
        );
      }, 10000);
    });
  }
  public async sendErrorToSlack(error: string) {
    await this.slackService.error(error);
  }
}

export default new RedshiftService();
