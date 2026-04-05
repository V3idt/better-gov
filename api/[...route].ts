import { createApiFetchHandler, getSharedDatabase } from "../server/app.ts";

const db = getSharedDatabase();
const handleRequest = createApiFetchHandler(db);

export default {
  fetch(request: Request) {
    return handleRequest(request);
  },
};
