import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import accountsRouter from "./accounts";
import cardsRouter from "./cards";
import paymentsRouter from "./payments";
import notificationsRouter from "./notifications";
import usersRouter from "./users";
import onboardingRouter from "./onboarding";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(accountsRouter);
router.use(cardsRouter);
router.use(paymentsRouter);
router.use(notificationsRouter);
router.use(usersRouter);
router.use(onboardingRouter);

export default router;
