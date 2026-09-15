import { Router } from "express";
import {
  getPublicCurrentRegionHandler,
  getPublicRegionListHandler,
} from "./regional.controller";

const router = Router();

// Public endpoints
router.get("/current", getPublicCurrentRegionHandler);
router.get("/list", getPublicRegionListHandler);

export default router;
