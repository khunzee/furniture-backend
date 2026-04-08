import { Request, Response, NextFunction } from "express";
import { query, validationResult } from "express-validator";
interface CustomRequest extends Request {
  userId?: number;
}

export const changeLanguage = [
  query("lng", "invalid language code.")
    .trim()
    .notEmpty()
    .matches("^[a-z]+$")
    .isLength({ min: 2, max: 3 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0].msg);
      error.status = 400;
      error.code = "Error_Invalid";
      return next(error);
    }

    const { lng } = req.query;

    req.i18n.changeLanguage(lng as string); // 🔥 change immediately

    res.cookie("lng", lng);

    res.status(200).json({
      message: req.t("changeLan", { lang: lng }),
    });
  },
];
export const testPermission = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const info = {
    title: "Test Permission",
  };

  res.status(200).json(info);
};
