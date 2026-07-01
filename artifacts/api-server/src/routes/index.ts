import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sightingsRouter from "./sightings";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sightingsRouter);
router.use(uploadsRouter);

export default router;
