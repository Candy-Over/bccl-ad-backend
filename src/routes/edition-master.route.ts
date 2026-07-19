import { Router } from "express";
import { cityList, editionForCity, editionMasterList } from "../controller/edition-master.controller.js";


const editionMaster = Router();

editionMaster.get("/city", cityList);
editionMaster.get("/edition/:city", editionForCity);
editionMaster.get("/", editionMasterList);

export default editionMaster;