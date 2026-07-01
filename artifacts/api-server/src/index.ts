import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapDatabase } from "./lib/bootstrap";
import { runRecurringInvoiceJob } from "./routes/invoices";

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

bootstrapDatabase()
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
      setInterval(() => {
        void runRecurringInvoiceJob().catch((error) => logger.error({ err: error }, "Recurring invoice job failed"));
      }, 24 * 60 * 60 * 1000);
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to bootstrap database, exiting");
    process.exit(1);
  });
