import { Router } from "express";
import {
  getDetails,
  getEditionDumTotal,
  getEditionSummaryByDate,
  getPageDiffSummery,
} from "../controller/dump-list.controller.js";

const dumpList = Router();

// Route to get paginated CSV data
dumpList.get("/", getPageDiffSummery);
dumpList.get("/edition-dump-total", getEditionDumTotal);
dumpList.get("/edition-summary", getEditionSummaryByDate);
dumpList.get("/details/:id", getDetails);

export default dumpList;