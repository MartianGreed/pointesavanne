import { createServer } from "./src/Application/api";

const port = Number(process.env.PORT) || 3000;
const server = createServer(port);

console.log(`Villa Booking API running on http://localhost:${server.port}`);
