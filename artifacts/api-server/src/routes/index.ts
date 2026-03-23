import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tradesRouter from "./trades";
import authRouter from "./auth";
import sheetsRouter from "./sheets";
import telegramRouter from "./telegram";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(tradesRouter);
router.use(sheetsRouter);
router.use(telegramRouter);

export default router;
