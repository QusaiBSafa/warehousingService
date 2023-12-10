import { Expose } from "class-transformer";
/**
 * @author Qusai Safa
 */
export abstract class Base {
  @Expose()
  producerUserId: Number;

  @Expose()
  eventName: string;

  @Expose()
  eventType: string;

  @Expose()
  eventTime: string;

  @Expose()
  eventSource: string;

  @Expose()
  id: Number;

  @Expose()
  createdBy?: Number;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;

  @Expose()
  deletedAt?: Date;

  @Expose()
  updatedBy?: Number;
}
