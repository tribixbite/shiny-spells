import type { App } from "@server";
import signin from "./signin";
import signout from "./signout";
import signup from "./signup";

export default (app: App) => {
	app.use(signup);
	app.use(signin);
	app.use(signout);
	return app;
};
