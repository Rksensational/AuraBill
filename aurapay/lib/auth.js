export const authed = (req) => !process.env.APP_PIN || req.headers.get('x-app-pin') === process.env.APP_PIN;
