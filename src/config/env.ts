import { config } from "dotenv";

config({ path: `.env` });
export const { PORT, SESSION_SECRET } = process.env;
