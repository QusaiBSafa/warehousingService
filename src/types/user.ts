import { KafkaEvent } from "./../types";
import { Expose, plainToInstance } from "class-transformer";
import { Base } from "./base";
/**
 * @author Qusai Safa
 */
export class User extends Base {
  @Expose()
  uuid?: string;

  //TODO: to be removed after warehousing doctors
  @Expose()
  fullName?: string;

  @Expose()
  roles: string;

  @Expose()
  language?: string;

  @Expose()
  verified?: Boolean;

  @Expose()
  signupSource?: string;

  @Expose()
  identityFront?: string;

  @Expose()
  identityBack?: string;

  @Expose()
  identityNumber?: string;

  @Expose()
  identityExpirationDate?: Date;

  @Expose()
  insuranceProviderId?: number;

  @Expose()
  insuranceProviderIdEnglishName?: string;

  @Expose()
  insuranceValidUntil?: Date;

  @Expose()
  insuranceCardFileName?: string;

  @Expose()
  insuranceCardNumber?: string;

  @Expose()
  insuranceGroup?: string;

  @Expose()
  insuranceType?: string;

  @Expose()
  insurancePlan?: string;

  @Expose()
  city?: string;

  @Expose()
  country?: string;

  @Expose()
  region?: string;

  @Expose()
  ipAddress?: string;

  @Expose()
  detectedCity?: string;

  @Expose()
  detectedCountry?: string;

  @Expose()
  detectedRegion?: string;

  @Expose()
  userTag?: string;

  @Expose()
  nationality?: string;

  @Expose()
  dateOfBirth?: Date;

  @Expose()
  gender?: string;

  @Expose()
  maritalStatus?: string;

  @Expose()
  religion?: string;

  @Expose()
  longitude?: string;

  @Expose()
  latitude?: string;

  @Expose()
  externalReferenceId?: number;

  @Expose()
  deviceToken?: string;

  @Expose()
  tenantKey?: number;

  @Expose()
  namespaceKey?: number;

  @Expose()
  lastActive?: Date;

  @Expose()
  status?: string;

  @Expose()
  ownerId?: number;

  @Expose()
  firstInstallAt?: Date;

  static mapper(event: KafkaEvent) {
    const user = event.details;
    const insuranceProvider = user?.insuranceProvider;
    const roles = user?.roles?.join(",");
    return plainToInstance(
      User,
      {
        ...user,
        producerUserId: event.producerUserId,
        eventType: event.eventType,
        eventTime: event.eventTime,
        eventSource: event.eventSource,
        userTag: user.tag,
        roles,
        insuranceProviderIdEnglishName: insuranceProvider?.englishName,
      },
      {
        excludeExtraneousValues: true,
      }
    );
  }
}
