import { Router, type IRouter } from "express";
import healthRouter from "./health";
import inventoryRouter from "./inventory";
import donorsRouter from "./donors";
import donationsRouter from "./donations";
import requestsRouter from "./requests";
import hospitalsRouter from "./hospitals";
import analyticsRouter from "./analytics";
import alertsRouter from "./alerts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/inventory", inventoryRouter);
router.use("/donors", donorsRouter);
router.use("/donations", donationsRouter);
router.use("/requests", requestsRouter);
router.use("/hospitals", hospitalsRouter);
router.use("/analytics", analyticsRouter);
router.use("/alerts", alertsRouter);

export default router;
