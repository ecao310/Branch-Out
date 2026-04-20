import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sightingsRouter from "./sightings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sightingsRouter);

export default router;
