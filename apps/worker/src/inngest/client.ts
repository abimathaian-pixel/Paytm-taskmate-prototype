import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "paytm-taskmate",
  eventKey: process.env.INNGEST_EVENT_KEY || "taskmate_dev_key",
});
