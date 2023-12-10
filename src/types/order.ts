import { KafkaEvent } from "./../types";
import { Expose, plainToInstance } from "class-transformer";
import { Base } from "./base";
/**
 * @author Qusai Safa
 */
export class Order extends Base {
  @Expose()
  userId?: number;

  @Expose()
  referenceOrderId?: number;

  @Expose()
  status?: string;

  @Expose()
  channel?: string;

  @Expose()
  userNotes?: string;

  @Expose()
  institute?: string;

  @Expose()
  totalPriceValue?: number;

  @Expose()
  totalPriceCurrency?: string;

  @Expose()
  hasPaymentTransaction?: boolean;

  @Expose()
  tenantKey?: number;

  @Expose()
  namespaceKey?: number;

  @Expose()
  outOfDeliveryAt?: Date;

  @Expose()
  deliveredAt?: Date;

  @Expose()
  failedDeliveryAttemptReason?: string;

  @Expose()
  driverId?: number;

  @Expose()
  logisticProviderName?: string;

  @Expose()
  logisticProviderId?: number;

  @Expose()
  externalTaskId?: number;

  @Expose()
  assigneeId?: number;

  @Expose()
  formattedDeliveryAddress?: string;

  @Expose()
  pinned?: boolean;

  static mapper(event: KafkaEvent) {
    const orderDetails = event.details;
    const shippingDetails = orderDetails?.shippingDetails;
    const prescriptions = orderDetails?.prescriptions?.join(",");
    const numberOfPrescriptions =
      prescriptions?.length > 0 ? orderDetails?.prescriptions?.length : 0;
    const primaryDiagnosis = orderDetails?.primaryDiagnosis?.join(",");
    const secondaryDiagnosis = orderDetails?.secondaryDiagnosis?.join(",");
    const logisticProviderId = orderDetails?.logisticProviderId;

    return plainToInstance(
      Order,
      {
        ...orderDetails,
        producerUserId: event.producerUserId,
        eventType: event.eventType,
        eventTime: event.eventTime,
        eventSource: event.eventSource,
        totalPriceValue: orderDetails.totalPrice?.value,
        totalPriceCurrency: orderDetails.totalPrice?.currency,
        totalDiscountValue: orderDetails.totalDiscount?.value,
        totalDiscountCurrency: orderDetails.totalDiscount?.currency,
        totalPatientShareValue: orderDetails.totalPatientShare?.value,
        totalPatientShareCurrency: orderDetails.totalPatientShare?.currency,
        totalPayerShareValue: orderDetails.totalPayerShare?.value,
        totalPayerShareCurrency: orderDetails.totalPatientShare?.currency,
        totalPatientDiscountValue: orderDetails?.totalPatientDiscount?.value,
        totalPatientDiscountCurrency:
          orderDetails?.totalPatientDiscount?.currency,
        prescriptions,
        logisticProviderId,
        numberOfPrescriptions,
        primaryDiagnosis,
        secondaryDiagnosis,
        outOfDeliveryAt: shippingDetails?.outOfDeliveryAt,
        deliveredAt: shippingDetails?.deliveredAt,
        failedDeliveryAttemptReason:
          shippingDetails?.failedDeliveryAttemptReason,
        externalTaskId: shippingDetails?.externalTaskId,
      },
      {
        excludeExtraneousValues: true,
      }
    );
  }
}
