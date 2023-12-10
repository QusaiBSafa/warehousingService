import RedshiftService from "./redshift.service";
import { User, KafkaEvent, Order } from "./../types";
import { logger } from "../utils";
import { Topic } from "../enums";
import config from "config";

/**
 * Current error messages
 *  get_user_location_error_code_2
    [FcmService] error
    get_user_location_error_code_
    zoom_join_error
    get_user_location_error_code_2
    [FcmService] error
    zoom_join_error
    Zoom Join Error
    zoom_initialize_error
    Error_Interceptor
    Error_Response_Interceptor
 *
    These and others with event name contains error or Error will be not saved in mobile events table
 */
const ERRORS_TO_EXCLUDE = ["Error", "error"];
const MOBILE_EVENTS_THRESHOLD = 50;
/**
 * This service responsible or transforming the events to real objects, and send query to redshift to save the new records.
 * @author Qusai Safa
 */
export class EventProcessorService {
  private mobileEvents: MobileEvent[] = [];
  /**
   * Insert order record
   * @param event
   */
  async insertOrderEvent(event: KafkaEvent) {
    const order = Order.mapper(event);
    const sqlQuery = `INSERT INTO event.order ${this.insertQueryBuilder(
      order
    )}`;
    await RedshiftService.query(sqlQuery, `${event.eventName}`);
    logger.debug(`inserting new record, SQL: ${sqlQuery}`);
  }

  /**
   * Insert user record
   * @param event
   */
  async insertUserEvent(event: KafkaEvent) {
    const user = User.mapper(event);
    const sqlQuery = `INSERT INTO event.user ${this.insertQueryBuilder(user)}`;
    await RedshiftService.query(sqlQuery, `${event.eventName}`);
    logger.debug(`inserting new record, SQL: ${sqlQuery}`);
  }

  /**
   * insert general event
   * @param event
   */
  async insertRowEvent(event: KafkaEvent) {
    const sqlQuery = `INSERT INTO event.row_event ${this.insertQueryBuilder(
      event
    )}`;
    await RedshiftService.query(sqlQuery, `${event.eventName}`);
    logger.debug(`inserting new record, SQL: ${sqlQuery}`);
  }
  /**
   * Map event to the appropriate object, or save to raw events table
   * @param result
   */
  async processEvent(topic: string, message: string) {
    let event: KafkaEvent = JSON.parse(message);
    if (!event) {
      logger.warn(`processing ignored for topic ${topic}, message: ${message}`);
    }

    logger.debug(
      `processing event from topic:${topic}, eventName:${event.eventName}, eventType:${event.eventType}`
    );

    switch (topic) {
      // Order events
      case Topic.ORDER:
        await this.insertOrderEvent(event);
        break;
      // User Events
      case Topic.USER:
        await this.insertUserEvent(event);
        break;

      default:
        // General events and row_events
        await this.insertRowEvent(event);
    }
  }

  multipleInsertQueryBuilder(listOfObjects: any[]): string {
    const columns = [];
    const sqlValues = [];

    Object.entries(listOfObjects[0]).forEach(([key, value]) => {
      columns.push(key.toLowerCase());
    });

    // This should be set with each record to define the source (eg, ae ...)
    columns.push("sourceCountryShortCode".toLowerCase());
    const sqlColumns = columns.join(",");
    for (const obj of listOfObjects) {
      const values = Object.values(obj);
      values.push(config.get<string>("sourceCountryShortCode") || "AE");
      const sqlValue = `(${this.extractQueryValues(values)})`;
      sqlValues.push(sqlValue);
    }

    return `(${sqlColumns}) VALUES ${sqlValues.join(",")}`;
  }

  /**
   * Build insert query from object fields and values
   * @param obj: any object
   * @returns
   */
  insertQueryBuilder(obj): string {
    const columns = [];
    const values = [];

    Object.entries(obj).forEach(([key, value]) => {
      if (value != null || value != undefined) {
        columns.push(key.toLowerCase());
        values.push(value);
      }
    });

    // This should be set with each record to define the source (eg, ae ...)
    columns.push("sourceCountryShortCode".toLowerCase());
    values.push(config.get<string>("sourceCountryShortCode") || "AE");

    const columnsSql = columns.join(",");
    const valuesSql = this.extractQueryValues(values);
    return `(${columnsSql}) VALUES(${valuesSql})`;
  }
  /**
   * This method transform list of values to sql values query like this (1, "create", "almaOs", "completed", ...)
   * Which will be used in insert query values part.
   */
  private extractQueryValues(objectFieldsValues: any[]) {
    const valuesSql = [];
    for (const objectFieldValue of objectFieldsValues) {
      if (objectFieldValue !== null && objectFieldValue !== undefined) {
        if (typeof objectFieldValue === "boolean") {
          valuesSql.push(objectFieldValue);
        } else if (typeof objectFieldValue === "number") {
          valuesSql.push(objectFieldValue);
        } else if (typeof objectFieldValue === "string") {
          let defaultValue;
          try {
            defaultValue = objectFieldValue?.replace(/[']/gi, "");
          } catch (err) {
            defaultValue = objectFieldValue;
          }
          valuesSql.push(`'${defaultValue}'`);
        } else {
          valuesSql.push(
            `'${JSON.stringify(objectFieldValue).replace(/[']/gi, "")}'`
          );
        }
      } else {
        valuesSql.push("null");
      }
    }

    return valuesSql.join(",");
  }
}
