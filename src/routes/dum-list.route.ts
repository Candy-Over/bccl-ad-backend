import { Router } from "express";
import {
  getDetails,
  getDetailsBulk,
  getEditionDumTotal,
  getEditionSummaryByDate,
  getPageDiffSummery,
} from "../controller/dump-list.controller.js";

const dumpList = Router();

// Route to get paginated CSV data
dumpList.get("/", getPageDiffSummery);
dumpList.get("/edition-dump-total", getEditionDumTotal);
dumpList.get("/edition-summary", getEditionSummaryByDate);
// Must be registered before "/details/:id" — otherwise "bulk" would be
// captured as the :id param instead of reaching this handler.
dumpList.get("/details/bulk", getDetailsBulk);
dumpList.get("/details/:id", getDetails);

export default dumpList;