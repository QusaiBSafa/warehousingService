import { Kafka, logLevel } from "kafkajs";
import { logger } from "../utils";
import { EventProcessorService } from "./event-processor.service";
import config from "config";
import { Topic } from "../enums";
import { SlackService } from "../services";
/**
 * This service responsible on fetching events from kafka stream and send it to events processor
 * @author Qusai Safa
 */
export class KafkaConsumerService {
  private kafka: Kafka;
  private eventProcessorService: EventProcessorService;
  private slackService: SlackService;
  constructor() {
    this.kafka = new Kafka({
      brokers: config.get<string>("kafka.brokers").split(","),
      ssl: false,
      logLevel: logLevel.ERROR,
      connectionTimeout: 9000,
      requestTimeout: 70000,
    });
    this.eventProcessorService = new EventProcessorService();
    this.slackService = new SlackService();
  }

  private topics = Object.values(Topic);

  public consume() {
    this.topics.forEach((topic) => {
      logger.info(`consume from topic ${topic}`);
      this.consumeTopic(topic);
    });
  }

  public async consumeTopic(topic: string) {
    const consumer = this.kafka.consumer({
      groupId: `Alma-health-consumer-group-id-${topic}`,
      sessionTimeout: 95000,
      heartbeatInterval: 40000,
      retry: { retries: 6, maxRetryTime: 62000, initialRetryTime: 300 },
    });
    await consumer.connect();
    await consumer.subscribe({ topic });
    consumer
      .run({
        eachBatchAutoResolve: false,
        autoCommitInterval: 5000,
        eachBatch: async ({
          batch,
          resolveOffset,
          heartbeat,
          isRunning,
          isStale,
        }) => {
          for (let message of batch.messages) {
            if (!isRunning() || isStale()) break;
            await this.eventProcessorService.processEvent(
              batch.topic,
              message.value.toString()
            );
            resolveOffset(message.offset);
            await heartbeat();
          }
        },
      })
      .catch((reason) =>
        this.slackService.error(
          JSON.stringify(reason || `consuming ${topic} error`)
        )
      );
  }
}
