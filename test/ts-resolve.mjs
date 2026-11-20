// ให้ node หา import แบบไม่มีนามสกุล (เช่น "../utils/date") เป็นไฟล์ .ts เหมือน bundler
import { registerHooks } from "node:module";
registerHooks({
  resolve(spec, ctx, next) {
    try {
      return next(spec, ctx);
    } catch (e) {
      if (spec.startsWith(".")) return next(spec + ".ts", ctx);
      throw e;
    }
  },
});
