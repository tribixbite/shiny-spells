type LogMethod = (objOrMsg: object | string, msg?: string) => void;

interface Logger {
	info: LogMethod;
	warn: LogMethod;
	error: LogMethod;
	debug: LogMethod;
	fatal: LogMethod;
}

const formatMessage = (
	level: string,
	objOrMsg: object | string,
	msg?: string,
): string => {
	const time = new Date().toISOString();
	if (typeof objOrMsg === "string") {
		return `[${time}] ${level.toUpperCase()}: ${objOrMsg}`;
	}
	return `[${time}] ${level.toUpperCase()}: ${msg ? msg : ""} ${JSON.stringify(objOrMsg)}`;
};

export const logger: Logger = {
	info: (objOrMsg, msg) => console.log(formatMessage("info", objOrMsg, msg)),
	warn: (objOrMsg, msg) => console.warn(formatMessage("warn", objOrMsg, msg)),
	error: (objOrMsg, msg) =>
		console.error(formatMessage("error", objOrMsg, msg)),
	debug: (objOrMsg, msg) =>
		console.debug(formatMessage("debug", objOrMsg, msg)),
	fatal: (objOrMsg, msg) =>
		console.error(formatMessage("fatal", objOrMsg, msg)), // Using console.error for fatal
};
