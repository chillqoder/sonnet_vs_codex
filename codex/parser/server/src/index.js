import { app } from "./app.js";
import { config } from "./config.js";

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`MoodFlix server running on http://localhost:${config.port}`);
});
