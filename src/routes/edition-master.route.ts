import { Router } from "express";
import { editionMasterList } from "../controller/edition-master.controller.js";


const editionMaster = Router();

editionMaster.get("/", editionMasterList);

export default editionMaster;