import config from "config";
import axios from "axios";
import { logger } from "./../utils";
import { Duration } from "./../common";

export class SlackService {
  async addCountsReport(payload: any, countryCode: string) {
    const date = new Date();
    date.setDate(date.getDate() - 1);

    const messageBody = {
      channel: config.get<string>("slack.warehouseChannel"),
      username: "AHDW",
      icon_emoji: `:flag-${countryCode.toLowerCase()}:`,
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: `Warehouse Report ${date.toLocaleDateString(
              "en-GB"
            )} for ${countryCode}`,
            emoji: true,
          },
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "plain_text",
            text: "Orders",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*New:* ${payload.createdOrders}`,
            },
            {
              type: "mrkdwn",
              text: `*Delivered:* ${payload.deliveredOrders}`,
            },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "plain_text",
            text: "Consultations",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*New:* ${payload.createdConsultations}`,
            },
            {
              type: "mrkdwn",
              text: `*Cancelled:* ${payload.cancelledConsultations}`,
            },
            {
              type: "mrkdwn",
              text: `*Completed:* \`${payload.completedConsultations}\``,
            },
            {
              type: "mrkdwn",
              text: `*No Show:* \`${payload.nowShowConsultations}\``,
            },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "plain_text",
            text: "Users",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*New:* ${payload.createdConsultations}`,
            },
            {
              type: "mrkdwn",
              text: `*Verified:* ${payload.verifiedUsers}`,
            },
            {
              type: "mrkdwn",
              text: `*IOS Active:* ${
                payload.iosActiveUsers + payload.iosNotLoggedInActiveUsers
              }`,
            },
            {
              type: "mrkdwn",
              text: `*Android Active:* ${
                payload.androidActiveUsers +
                payload.androidNotLoggedInActiveUsers
              }`,
            },
            {
              type: "mrkdwn",
              text: `*Huawei Active:* ${
                payload.huaweiActiveUsers + payload.huaweiNotLoggedInActiveUsers
              }`,
            },
            {
              type: "mrkdwn",
              text: `*Mobile Web Active:* ${
                payload.mobileWebActiveUsers +
                payload.mobileWebNotLoggedInActiveUsers
              }`,
            },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "plain_text",
            text: `Totals of ${date.toLocaleString("default", {
              month: "long",
            })} :flag-${countryCode.toLowerCase()}:`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Completed Consultations:* \`${payload.currentMonthCompletedConsultations}\``,
            },
            {
              type: "mrkdwn",
              text: `*No Show Consultations:* \`${payload.currentMonthNoShowConsultations}\``,
            },
            {
              type: "mrkdwn",
              text: `*Delivered Orders:* \`${payload.currentMonthDeliveredOrders}\``,
            },
            {
              type: "mrkdwn",
              text: `*Verified Users:* \`${payload.currentMonthVerifiedUsers}\``,
            },
            {
              type: "mrkdwn",
              text: `*Monthly Cons. Patients ->*  total:\`${
                payload.currentMonthConsultationsPatient
              }\`, 1st time patients:\`${
                payload.currentMonthConsultationsNewPatient
              }\`, returning patients:\` ${(
                (1 -
                  payload.currentMonthConsultationsNewPatient /
                    payload.currentMonthConsultationsPatient) *
                100
              ).toFixed(0)} %\``,
            },
          ],
        },
        {
          type: "divider",
        },
      ],
    };
    return await this.sendSlackMessage(messageBody);
  }

  async addRevenueReport(payload: any, countryCode: string, currency: string) {
    const messageBody = {
      channel: config.get<string>("slack.revenueChannel") || "C03J7308L8Y",
      username: "AHDW",
      icon_emoji: ":moneybag:",
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: `Warehouse Revenue Report ${new Date(
              new Date().setDate(new Date().getDate() - 1)
            ).toLocaleDateString("en-GB")} For ${countryCode}`,
            emoji: true,
          },
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "plain_text",
            text: "Orders",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Daily revenue for (${
                payload.dayNumberOfOrders
              }) delivered orders:* ${this.formateNumber(
                payload.ordersDayRevenue
              )} ${currency}`,
            },
            {
              type: "mrkdwn",
              text: `*Weekly revenue for (${
                payload.weekNumberOfOrders
              }) delivered orders:* ${this.formateNumber(
                payload.ordersWeekRevenue
              )} ${currency}`,
            },
            {
              type: "mrkdwn",
              text: `*Monthly revenue for (${
                payload.monthNumberOfOrders
              }) delivered orders:* \`${this.formateNumber(
                payload.ordersMonthRevenue
              )} ${currency}\``,
            },
          ],
        },
      ],
    };
    return await this.sendSlackMessage(messageBody);
  }

  async addDoctorsReport(
    name: string,
    payload: any,
    countryCode: string,
    duration: Duration
  ): Promise<string> {
    const title =
      duration === Duration.WEEK
        ? `Weekly report between (${new Date(
            new Date().setDate(new Date().getDate() - 7)
          ).toLocaleDateString("en-GB")}) and (${new Date().toLocaleDateString(
            "en-GB"
          )}) for `
        : `${new Date(
            new Date().setDate(new Date().getDate() - 1)
          ).toLocaleDateString("en-GB", {
            month: "long",
          })} Monthly report for `;
    let blocks = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: `${title}${name} for ${countryCode}`,
          emoji: true,
        },
      },
      {
        type: "divider",
      },
    ];
    return await this.divideDoctorReportAndSendToSlack(blocks, payload);
  }

  async addRenewalCompletionReport(
    duration: Duration,
    remindersReportMap: any,
    countryCode: string,
    channel: string
  ) {
    const options = { month: "long" as const };
    const title =
      duration === Duration.WEEK
        ? `Weekly Renewal Reminder Revenues Report between (${new Date(
            new Date().setDate(new Date().getDate() - 14)
          ).toLocaleDateString("en-GB")}) and (${new Date(
            new Date().setDate(new Date().getDate() - 7)
          ).toLocaleDateString("en-GB")}) `
        : `Monthly Renewal Reminder Revenues Report for ${new Date().toLocaleString(
            "default",
            options
          )} `;
    let blocks = [];
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `${title} for ${countryCode}`,
        emoji: true,
      },
    });
    await this.createReminderBlocks(blocks, remindersReportMap);
    const messageBody = {
      channel: channel,
      username: "AHDW",
      icon_emoji: ":moneybag:",
      blocks,
    };
    return await this.sendSlackMessage(messageBody);
  }

  async createReminderBlocks(blocks: any[], orders: any) {
    orders.map((order) => {
      blocks.push({
        type: "section",
        text: {
          type: "plain_text",
          text: `Reminder Date: ${order.reminderdate}`,
          emoji: true,
        },
      });
      const fields = [];
      fields.push({
        type: "mrkdwn",
        text: `*#of orders renewals*: \`${order.numberOfReminders}\``,
      });
      fields.push({
        type: "mrkdwn",
        text: `*#of created consultations*: \`${order.numberOfConsultations}\``,
      });
      fields.push({
        type: "mrkdwn",
        text: `*#of created orders*: \`${order.numberOfFollowOrders}\``,
      });
      fields.push({
        type: "mrkdwn",
        text: `*Renewal success rate*: \`${(
          (order?.numberOfConsultations / order?.numberOfReminders) *
          100
        )?.toFixed(2)}%\``,
      });
      fields.push({
        type: "mrkdwn",
        text: `*Total revenue*: \`${order.revenues?.toFixed(2)}\``,
      });
      blocks.push({
        type: "section",
        fields,
      });
      blocks.push({
        type: "divider",
      });
    });
  }

  async createDoctorsFields(blocks: any[], reportMap: any) {
    for (const [doctorName, doctorRecords] of reportMap) {
      blocks.push({
        type: "section",
        text: {
          type: "plain_text",
          text: doctorName,
          emoji: true,
        },
      });
      let fields = [];
      for (const property in doctorRecords) {
        fields.push({
          type: "mrkdwn",
          text: `*${property}*: \`${doctorRecords[property]}\``,
        });
      }
      blocks.push({
        type: "section",
        fields,
      });
      blocks.push({
        type: "divider",
      });
    }
    return blocks;
  }

  async error(message: string) {
    const messageBody = {
      channel: config.get<string>("slack.errorChannel") || "C022U5RL9B8",
      username: "Error",
      text: `Warehouse New error!! <!channel>`,
      icon_emoji: ":interrobang:",
      blocks: [
        {
          type: "section",
          block_id: "section567",
          text: {
            type: "mrkdwn",
            text: message,
          },
        },
      ],
    };
    return await this.sendSlackMessage(messageBody);
  }

  private async sendSlackMessage(messageBody: Record<string, any>) {
    if (config.get<boolean>("slack.enable")) {
      return await axios
        .post("https://slack.com/api/chat.postMessage", messageBody, {
          headers: {
            Authorization: config.get<string>("slack.token"),
          },
        })
        .catch((err) => {
          logger.error(err);
        });
    }
  }

  async addOrdersRenewalReminderReport(
    almaOsUrl: string,
    date: string,
    orders: any[],
    channel: string
  ) {
    const title = `<!channel> Reminder to contact patients for orders`;
    const messageBody = {
      channel: channel,
      username: "AHDW",
      icon_emoji: ":moneybag:",
      text: `${title}\n${orders
        .map(
          (order) =>
            `${almaOsUrl}/order/${order.id} - Price: ${
              this.formateNumber(order.totalpricevalue, 2) || "N/A"
            }`
        )
        .join("\n")}`,
      attachments: [
        {
          color: "#2eb886",
          callback_id: "order",
          attachment_type: "default",
          fields: [
            {
              title: "Number of orders",
              value: orders.length,
              short: true,
            },
            {
              title: "Date",
              value: date,
              short: true,
            },
          ],
        },
      ],
    };
    return await this.sendSlackMessage(messageBody);
  }

  private formateNumber(number: string, roundTo = 0) {
    const fixedNumber = Number(number).toFixed(roundTo);
    return fixedNumber.replace(/(.)(?=(\d{3})+$)/g, "$1,");
  }

  async divideDoctorReportAndSendToSlack(
    blocks: any,
    payload
  ): Promise<string> {
    const [map1, map2] = await this.splitMap(payload);
    await this.sendChunkToSlack(blocks, map1);
    if (map2.size > 0) await this.sendChunkToSlack(blocks, map2);
    return blocks;
  }
  private async sendChunkToSlack(blocks: any, map: Map<any, any>) {
    let blocksNew = [];
    blocksNew.push(...blocks);
    const messageBody = {
      channel: config.get<string>("slack.doctorsReportChannel"),
      username: "AHDW",
      icon_emoji: ":lab_coat:",
      blocks: await this.createDoctorsFields(blocksNew, map),
    };
    await this.sendSlackMessage(messageBody);
  }

  async splitMap(map) {
    const map1 = new Map();
    const map2 = new Map();

    for (const [key, value] of map.entries()) {
      if (map1.size < 14) {
        map1.set(key, value);
      } else {
        map2.set(key, value);
      }
    }
    return [map1, map2];
  }
}
